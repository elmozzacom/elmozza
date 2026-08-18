/**
 * Web Push for Cloudflare Workers: VAPID (RFC 8292) + aes128gcm (RFC 8291).
 *
 * Written against WebCrypto only — no Node built-ins, no npm dependency — so it
 * runs unchanged in a Worker and in `node --test`.
 */

const encoder = new TextEncoder();

export function b64urlToBytes(value) {
	const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
	const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
	const out = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
	return out;
}

export function bytesToB64url(input) {
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	let binary = '';
	for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function concatBytes(...parts) {
	const total = parts.reduce((sum, part) => sum + part.length, 0);
	const out = new Uint8Array(total);
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.length;
	}
	return out;
}

/**
 * The VAPID private key is the raw 32-byte scalar; the public key is the
 * 65-byte uncompressed point. WebCrypto has no "raw private EC key" import, so
 * the pair is reassembled as a JWK.
 */
async function importSigningKey(publicKeyB64, privateKeyB64) {
	const publicKey = b64urlToBytes(publicKeyB64);
	const privateKey = b64urlToBytes(privateKeyB64);
	if (publicKey.length !== 65 || publicKey[0] !== 0x04) {
		throw new Error('VAPID public key must be a 65-byte uncompressed P-256 point');
	}
	if (privateKey.length !== 32) {
		throw new Error('VAPID private key must be 32 bytes');
	}
	return crypto.subtle.importKey(
		'jwk',
		{
			kty: 'EC',
			crv: 'P-256',
			x: bytesToB64url(publicKey.slice(1, 33)),
			y: bytesToB64url(publicKey.slice(33, 65)),
			d: bytesToB64url(privateKey),
			ext: true
		},
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign']
	);
}

/** Builds the `Authorization: vapid t=<jwt>, k=<public key>` header value. */
export async function vapidAuthorization(endpoint, vapid, nowSeconds = Math.floor(Date.now() / 1000)) {
	const audience = new URL(endpoint).origin;
	const header = bytesToB64url(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
	const payload = bytesToB64url(
		encoder.encode(
			JSON.stringify({
				aud: audience,
				// Twelve hours: comfortably inside the 24h ceiling push services enforce.
				exp: nowSeconds + 12 * 60 * 60,
				sub: vapid.subject
			})
		)
	);
	const signingInput = `${header}.${payload}`;
	const key = await importSigningKey(vapid.publicKey, vapid.privateKey);
	// ECDSA via WebCrypto already returns the raw r||s pair that JWS ES256 wants.
	const signature = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		key,
		encoder.encode(signingInput)
	);
	return `vapid t=${signingInput}.${bytesToB64url(signature)}, k=${vapid.publicKey}`;
}

/**
 * Encrypts one aes128gcm record for a subscription.
 *
 * Body framing (RFC 8188 §2.1):
 *   salt(16) || record size(4) || key id length(1) || sender public key(65) || ciphertext
 */
export async function encryptPayload(plaintextString, p256dhB64, authB64, recordSize = 4096) {
	const uaPublic = b64urlToBytes(p256dhB64);
	const authSecret = b64urlToBytes(authB64);
	if (uaPublic.length !== 65 || uaPublic[0] !== 0x04) {
		throw new Error('subscription p256dh must be a 65-byte uncompressed P-256 point');
	}

	const salt = crypto.getRandomValues(new Uint8Array(16));
	const sender = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
		'deriveBits'
	]);
	const senderPublic = new Uint8Array(await crypto.subtle.exportKey('raw', sender.publicKey));

	const recipient = await crypto.subtle.importKey(
		'raw',
		uaPublic,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		[]
	);
	const shared = new Uint8Array(
		await crypto.subtle.deriveBits({ name: 'ECDH', public: recipient }, sender.privateKey, 256)
	);

	// RFC 8291 §3.3: the auth secret is the salt of the first HKDF.
	const sharedKey = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveBits']);
	const keyInfo = concatBytes(
		encoder.encode('WebPush: info'),
		new Uint8Array([0]),
		uaPublic,
		senderPublic
	);
	const ikm = new Uint8Array(
		await crypto.subtle.deriveBits(
			{ name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: keyInfo },
			sharedKey,
			256
		)
	);

	const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
	const contentKey = new Uint8Array(
		await crypto.subtle.deriveBits(
			{
				name: 'HKDF',
				hash: 'SHA-256',
				salt,
				info: concatBytes(encoder.encode('Content-Encoding: aes128gcm'), new Uint8Array([0]))
			},
			ikmKey,
			128
		)
	);
	const nonce = new Uint8Array(
		await crypto.subtle.deriveBits(
			{
				name: 'HKDF',
				hash: 'SHA-256',
				salt,
				info: concatBytes(encoder.encode('Content-Encoding: nonce'), new Uint8Array([0]))
			},
			ikmKey,
			96
		)
	);

	const aesKey = await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt']);
	// 0x02 is the "last record" delimiter; without it Chrome rejects the payload.
	const padded = concatBytes(encoder.encode(plaintextString), new Uint8Array([2]));
	const ciphertext = new Uint8Array(
		await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded)
	);

	if (ciphertext.length > recordSize) {
		throw new Error('notification payload is larger than one record');
	}

	const size = new Uint8Array(4);
	new DataView(size.buffer).setUint32(0, recordSize);
	return concatBytes(salt, size, new Uint8Array([senderPublic.length]), senderPublic, ciphertext);
}

/**
 * Delivers one notification.
 *
 * Returns the push service status rather than throwing, so the caller can tell
 * "this device is gone" (404/410) apart from a transient failure.
 */
export async function sendPush(subscription, notification, vapid, fetchImpl = fetch) {
	const body = await encryptPayload(
		JSON.stringify(notification),
		subscription.keys.p256dh,
		subscription.keys.auth
	);
	const authorization = await vapidAuthorization(subscription.endpoint, vapid);

	const response = await fetchImpl(subscription.endpoint, {
		method: 'POST',
		headers: {
			Authorization: authorization,
			'Content-Encoding': 'aes128gcm',
			'Content-Type': 'application/octet-stream',
			TTL: '86400',
			Urgency: 'normal'
		},
		body
	});

	return {
		ok: response.status >= 200 && response.status < 300,
		status: response.status,
		gone: response.status === 404 || response.status === 410
	};
}
