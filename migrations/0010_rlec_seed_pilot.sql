-- Real-Life English Coach (RLEC) Phase 2 — seed pilot scenarios + Learning Memory
-- + Telegram link codes + Tomorrow notes. Additive only (CREATE ... IF NOT EXISTS,
-- INSERT OR IGNORE). No ALTER/DROP/UPDATE/DELETE. Safe to run twice.
-- Pilot scenarios use status='pilot': served only to RLEC_PILOT_USER_IDS or superadmin.
-- All medical content is generic and fictional (no real patients).

PRAGMA foreign_keys = ON;

-- Free-text BYO errors that do not map to a known pattern are kept as events
-- with this code; they never create rlec_learner_errors rows (see db.ts).
INSERT OR IGNORE INTO rlec_error_patterns (code, category, label, description, default_severity) VALUES
  ('UNCLASSIFIED', 'meaning', 'Unclassified', 'Imported correction that did not match a known pattern; kept for review.', 1);

-- One-time codes to link a Telegram account to a logged-in web user.
-- Only a SHA-256 hash of the 6-digit code is stored.
CREATE TABLE IF NOT EXISTS rlec_link_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  channel TEXT NOT NULL DEFAULT 'telegram' CHECK (channel IN ('telegram')),
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rlec_link_codes_hash ON rlec_link_codes(code_hash, used_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_rlec_link_codes_user ON rlec_link_codes(user_id, created_at);

-- "Besok mau ngapain?" notes (Tomorrow Mode input, before the AI step exists).
CREATE TABLE IF NOT EXISTS rlec_tomorrow_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  text TEXT NOT NULL CHECK (length(text) BETWEEN 3 AND 500),
  scenario_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (scenario_id) REFERENCES rlec_scenarios(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_rlec_tomorrow_notes_user ON rlec_tomorrow_notes(user_id, created_at);

-- Learning Memory: positive evidence next to Error Memory.
CREATE TABLE IF NOT EXISTS rlec_skills (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL
);
INSERT OR IGNORE INTO rlec_skills (code, label, description) VALUES
  ('FLUENCY',               'Fluency',               'Keeps talking without long pauses; uses fillers and repair phrases.'),
  ('VOCAB_RANGE',           'Vocabulary range',      'Uses the right words and new phrases for the situation.'),
  ('GRAMMAR_ACCURACY',      'Grammar accuracy',      'Tenses, articles, agreement, prepositions and question forms are correct.'),
  ('PRONUNCIATION',         'Pronunciation',         'Sounds, final consonants and word stress are clear.'),
  ('LISTENING',             'Listening',             'Understands the partner and answers the actual question.'),
  ('INTERACTION',           'Interaction',           'Asks questions, clarifies, checks understanding, keeps the meaning clear.'),
  ('PROFESSIONAL_REGISTER', 'Professional register', 'Polite, appropriate tone for staff, clients, patients and families.'),
  ('CONFIDENCE',            'Confidence',            'Finishes scenarios and handles unexpected challenges.');

CREATE TABLE IF NOT EXISTS rlec_success_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_id INTEGER,
  skill_code TEXT NOT NULL,
  pattern_code TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('retry_success','correct_use','phrase_used','scenario_completed')),
  evidence_text TEXT,
  source TEXT NOT NULL DEFAULT 'internal' CHECK (source IN ('internal','byo_paste','internal_tutor')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES rlec_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (skill_code) REFERENCES rlec_skills(code),
  FOREIGN KEY (pattern_code) REFERENCES rlec_error_patterns(code)
);
CREATE INDEX IF NOT EXISTS idx_rlec_success_events_user ON rlec_success_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rlec_success_events_session ON rlec_success_events(session_id);

-- strength 0..1; baseline_* is a rolling 7-day snapshot so trend_delta = strength - baseline.
CREATE TABLE IF NOT EXISTS rlec_skill_strength (
  user_id INTEGER NOT NULL,
  skill_code TEXT NOT NULL,
  strength REAL NOT NULL DEFAULT 0.3 CHECK (strength BETWEEN 0 AND 1),
  evidence_count INTEGER NOT NULL DEFAULT 0,
  positive_count INTEGER NOT NULL DEFAULT 0,
  negative_count INTEGER NOT NULL DEFAULT 0,
  last_evidence_at TEXT,
  baseline_strength REAL NOT NULL DEFAULT 0.3 CHECK (baseline_strength BETWEEN 0 AND 1),
  baseline_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trend_delta REAL NOT NULL DEFAULT 0,
  mastery_level TEXT NOT NULL DEFAULT 'emerging' CHECK (mastery_level IN ('emerging','developing','secure','mastered')),
  PRIMARY KEY (user_id, skill_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_code) REFERENCES rlec_skills(code)
);

-- 10 pilot scenarios (owner set, 3 Oct 2026). Idempotent via (source_kind, source_ref).
INSERT OR IGNORE INTO rlec_scenarios (source_kind, source_ref, title, domain, subdomain, place, situation, cefr, difficulty, role_a, role_b, learner_role_default, goal, context_brief, expected_vocab_json, useful_phrases_json, grammar_targets_json, likely_questions_json, likely_problems_json, unexpected_challenge, cultural_notes, safety_notes, model_instructions, correction_policy, status, created_by) VALUES
  ('manual',
   'RLEC-PILOT-01',
   'ICU shift handover to a foreign colleague',
   'healthcare',
   'icu',
   'ICU nurses'' station, 7 p.m.',
   'End of the day shift. You hand over one stable patient and one patient who needs close watching to the night doctor, who is visiting from Australia.',
   'B1',
   3,
   'Dr. Emma Clarke — visiting ICU doctor from Australia who takes over the night shift',
   'Dr. Rina — ICU doctor finishing the day shift',
   'role_b',
   'Give a clear, structured handover for two fictional patients (situation, background, current status, plan) and check that your colleague understood.',
   'Bed 3: a fictional 58-year-old man after abdominal surgery, stable, pain controlled. Bed 5: a fictional 70-year-old woman with pneumonia on oxygen; her oxygen need went up this afternoon. All patients are fictional teaching cases.',
   '["handover", "stable", "vital signs", "blood pressure", "oxygen saturation", "pain score", "to monitor", "to deteriorate", "plan for tonight", "to escalate"]',
   '["Let me hand over two patients.", "Bed 3 is stable. His vital signs are normal.", "She needed more oxygen this afternoon.", "Please keep an eye on her breathing.", "If her saturation drops below 92%, please call the consultant.", "Is there anything you want me to repeat?", "Do you have any questions before I go?"]',
   '["Simple past for events during the shift (She needed more oxygen at 3 p.m.)", "Present perfect for changes up to now (Her oxygen need has increased.)", "First conditional for the plan (If it drops, please call...)"]',
   '["What happened to the patient in bed 5 this afternoon?", "What is her oxygen saturation now?", "Is the family aware of the situation?", "What is the plan if she gets worse?", "Are there any pending lab results?"]',
   '["Your colleague asks about a lab result you have not checked yet.", "You forget the exact number and need to buy time politely."]',
   'Halfway through, Dr. Clarke says: "Sorry, the alarm on bed 5 just went off. Her saturation is 89%. What do you want me to do first?"',
   'Handover dalam bahasa Inggris biasanya terstruktur (mis. SBAR). Pasien fiktif, bukan kasus nyata.',
   'Fictional teaching case only. No real patient data. Do not give real treatment advice beyond the role-play.',
   'ROLE: You are Dr. Emma Clarke (visiting ICU doctor from Australia who takes over the night shift). Never switch roles and never speak for the learner. SCENARIO: You are in the ICU at 7 p.m. receiving a handover of two fictional patients. Ask natural follow-up questions a careful doctor would ask. If the learner goes off-topic, steer back politely in one sentence. LEVEL: B1: short clear sentences, common words, explain any technical word in simple English, one question per turn. Do not use Indonesian.',
   'intermediate',
   'pilot',
   'hermes');

INSERT OR IGNORE INTO rlec_scenarios (source_kind, source_ref, title, domain, subdomain, place, situation, cefr, difficulty, role_a, role_b, learner_role_default, goal, context_brief, expected_vocab_json, useful_phrases_json, grammar_targets_json, likely_questions_json, likely_problems_json, unexpected_challenge, cultural_notes, safety_notes, model_instructions, correction_policy, status, created_by) VALUES
  ('manual',
   'RLEC-PILOT-02',
   'Explaining an ICU patient''s condition to a foreign family',
   'healthcare',
   'icu_family',
   'Family room next to the ICU',
   'The daughter of a fictional patient arrived from abroad today. You explain her father''s condition in plain words, with empathy, and answer her worries.',
   'B1',
   4,
   'Laura Bennett — daughter of a fictional ICU patient, just arrived from the UK, worried and tired',
   'Dr. Rina — ICU doctor caring for her father',
   'role_b',
   'Explain the condition in plain language, show empathy, check understanding, and agree on the next update time.',
   'Her fictional father, Mr. Bennett (75), has a severe lung infection. He is on a breathing machine and is sedated. He is stable today but still seriously ill. All details are fictional.',
   '["breathing machine", "sedated", "infection", "seriously ill", "stable", "antibiotics", "improve", "update", "visiting hours", "comfortable"]',
   '["I''m sorry you had to travel so far.", "Let me explain in simple words.", "Your father is seriously ill, but he is stable today.", "The machine helps him breathe while his lungs heal.", "He is not in pain. We keep him comfortable.", "Does that make sense so far?", "I will update you again tomorrow morning."]',
   '["Present continuous for current treatment (We are giving him antibiotics.)", "Modal verbs for possibility (He may need the machine for a few more days.)"]',
   '["Is my father going to be okay?", "Can he hear me if I talk to him?", "Why does he need the machine?", "How long will he stay in the ICU?", "Can I stay with him tonight?"]',
   '["She asks for a clear yes or no about recovery that you cannot honestly give.", "She uses a medical word she read online and is frightened by it."]',
   'Laura starts crying and says: "Please just tell me the truth. Is he going to die?"',
   'Gaya bicara keluarga di negara barat: ingin jujur dan langsung, tetapi tetap dengan empati. Pasien fiktif.',
   'Fictional patient. Keep language respectful and calm. Do not invent real prognosis statistics.',
   'ROLE: You are Laura Bennett (daughter of a fictional ICU patient, just arrived from the UK, worried and tired). Never switch roles and never speak for the learner. SCENARIO: You are the patient''s daughter in a quiet family room. React like a real worried relative: ask simple questions, sometimes repeat a worry. If the learner goes off-topic, steer back politely in one sentence. LEVEL: B1: short clear sentences, common words, explain any technical word in simple English, one question per turn. Do not use Indonesian.',
   'intermediate',
   'pilot',
   'hermes');

INSERT OR IGNORE INTO rlec_scenarios (source_kind, source_ref, title, domain, subdomain, place, situation, cefr, difficulty, role_a, role_b, learner_role_default, goal, context_brief, expected_vocab_json, useful_phrases_json, grammar_targets_json, likely_questions_json, likely_problems_json, unexpected_challenge, cultural_notes, safety_notes, model_instructions, correction_policy, status, created_by) VALUES
  ('manual',
   'RLEC-PILOT-03',
   'Vendor meeting: delivery date, discount, and a delay',
   'workplace',
   'procurement',
   'Hospital meeting room (video call with the vendor)',
   'You meet the sales manager of a medical equipment vendor from Singapore to confirm the delivery of ICU monitors and ask for a better price.',
   'B1',
   3,
   'Mr. Daniel Tan — sales manager of a medical equipment vendor in Singapore',
   'Dr. Hendry — hospital director responsible for the purchase',
   'role_b',
   '(1) Confirm the delivery date, (2) ask for a discount, (3) handle the delay the vendor announces and agree on a solution.',
   'The hospital ordered 10 ICU monitors. The contract says delivery on 15 November. The quoted price is fixed for now, but the hospital hopes for a volume discount.',
   '["delivery date", "quotation", "discount", "volume", "warranty", "shipment", "delay", "installation", "training", "contract"]',
   '["Could you confirm the delivery date?", "Would it be possible to get a discount for ten units?", "I''m afraid that doesn''t work for us.", "Let''s meet halfway.", "What can you offer to make up for the delay?", "Could you put that in writing, please?", "So, just to confirm, we agreed on..."]',
   '["Polite requests with could/would (Would it be possible to...?)", "Future forms for plans and promises (The shipment will arrive...; We are going to...)"]',
   '["How many units do you need, and when?", "Is the price the main issue for you?", "Do you also need installation and training?", "Can you accept a partial delivery?", "Who will sign the final agreement?"]',
   '["The vendor says the discount is only possible if you pay in advance.", "The vendor gives a vague date like \"sometime in December\"."]',
   'On turn 6, Mr. Tan says: "I have some bad news. The shipment will be three weeks late because of a supplier problem."',
   'Negosiasi dengan vendor Singapura: sopan, langsung ke angka, minta konfirmasi tertulis.',
   'Fictional companies and prices.',
   'ROLE: You are Mr. Daniel Tan (sales manager of a medical equipment vendor in Singapore). Never switch roles and never speak for the learner. SCENARIO: You are in a business video call about 10 ICU monitors. Be friendly but protect your company''s price. If the learner goes off-topic, steer back politely in one sentence. LEVEL: B1: short clear sentences, common words, explain any technical word in simple English, one question per turn. Do not use Indonesian.',
   'intermediate',
   'pilot',
   'hermes');

INSERT OR IGNORE INTO rlec_scenarios (source_kind, source_ref, title, domain, subdomain, place, situation, cefr, difficulty, role_a, role_b, learner_role_default, goal, context_brief, expected_vocab_json, useful_phrases_json, grammar_targets_json, likely_questions_json, likely_problems_json, unexpected_challenge, cultural_notes, safety_notes, model_instructions, correction_policy, status, created_by) VALUES
  ('manual',
   'RLEC-PILOT-04',
   'Presenting a short case at a scientific meeting',
   'conference',
   'presentation',
   'Small conference room, regional medical meeting',
   'You present a short fictional case report (about 3 minutes) and then answer one question from the chair.',
   'B1',
   4,
   'Prof. Michael Grant — session chair at an international medical meeting',
   'Dr. Rina — presenter of a short case report',
   'role_b',
   'Introduce the case, give the key result clearly, state one take-home message, and handle one question from the chair calmly.',
   'A fictional case: a 45-year-old patient with a rare drug reaction that improved after the drug was stopped. Slides: background, case, result, take-home message. All details are fictional.',
   '["case report", "background", "outcome", "finding", "limitation", "take-home message", "slide", "to suggest", "evidence", "follow-up"]',
   '["Good morning. Today I will present a short case.", "On this slide, you can see...", "The main finding was...", "One limitation is that this is a single case.", "My take-home message is...", "Thank you for your question.", "That''s a good point. I''m not sure, but I think..."]',
   '["Simple past for what happened in the case (The patient developed a rash.)", "Signposting with present simple (This slide shows...; Next, I will...)", "Hedging with may/might/suggest (This may suggest...)"]',
   '["Could you tell us more about the patient''s history?", "How did you confirm the diagnosis?", "What would you do differently next time?", "Have you seen similar cases before?", "What is the main lesson for other doctors?"]',
   '["The chair asks a question you did not understand the first time.", "You run out of time and must finish quickly."]',
   'The chair interrupts: "Sorry, we are short on time. Could you give us your main message in one sentence?"',
   'Di konferensi internasional, menjawab "I don''t know, but..." dengan jujur lebih dihargai daripada menebak.',
   'Fictional case only. No real patient data.',
   'ROLE: You are Prof. Michael Grant (session chair at an international medical meeting). Never switch roles and never speak for the learner. SCENARIO: You chair a session at a medical meeting. Let the learner present, then ask exactly one question and one short follow-up. If the learner goes off-topic, steer back politely in one sentence. LEVEL: B1: short clear sentences, common words, explain any technical word in simple English, one question per turn. Do not use Indonesian.',
   'intermediate',
   'pilot',
   'hermes');

INSERT OR IGNORE INTO rlec_scenarios (source_kind, source_ref, title, domain, subdomain, place, situation, cefr, difficulty, role_a, role_b, learner_role_default, goal, context_brief, expected_vocab_json, useful_phrases_json, grammar_targets_json, likely_questions_json, likely_problems_json, unexpected_challenge, cultural_notes, safety_notes, model_instructions, correction_policy, status, created_by) VALUES
  ('manual',
   'RLEC-PILOT-05',
   'Conference Q&A and coffee-break networking',
   'conference',
   'networking',
   'Coffee break area at an international conference',
   'After a session, a speaker you admire is standing near the coffee table. You start a short conversation, ask about the talk, and exchange contacts.',
   'B1',
   3,
   'Dr. Sofia Martins — speaker from Portugal who just gave a talk on ICU nutrition',
   'Dr. Hendry — doctor from Indonesia attending the conference',
   'role_b',
   'Start small talk, ask one good question about the talk, share a little about your work, and politely exchange contact details.',
   'It is the second day of the conference. Dr. Martins spoke about early nutrition in ICU patients. You have 10 minutes before the next session.',
   '["session", "talk", "research", "colleague", "to collaborate", "business card", "to keep in touch", "coffee break", "to introduce", "interesting"]',
   '["Excuse me, Dr. Martins? I really enjoyed your talk.", "May I ask you a quick question about it?", "In our hospital, we usually...", "That''s really interesting.", "Would you mind if I emailed you later?", "It was nice talking to you.", "Enjoy the rest of the conference!"]',
   '["Questions with correct word order (What did you find most surprising?)", "Present simple for routines at work (We usually start feeding on day two.)"]',
   '["Where are you from, and where do you work?", "What did you think of my talk?", "Is this your first time at this conference?", "What is your research about?", "Are you staying for the dinner tonight?"]',
   '["She asks about your research and you need to explain it simply.", "Another person joins the conversation and you must include them."]',
   'Dr. Martins says: "Sorry, I have to go to a meeting in two minutes. Is there anything else you wanted to ask?"',
   'Small talk yang wajar: puji presentasinya secara spesifik, jangan langsung minta bantuan besar.',
   'Fictional people.',
   'ROLE: You are Dr. Sofia Martins (speaker from Portugal who just gave a talk on ICU nutrition). Never switch roles and never speak for the learner. SCENARIO: You are at a conference coffee break. Be friendly and natural, keep answers short, and ask the learner questions back. If the learner goes off-topic, steer back politely in one sentence. LEVEL: B1: short clear sentences, common words, explain any technical word in simple English, one question per turn. Do not use Indonesian.',
   'intermediate',
   'pilot',
   'hermes');

INSERT OR IGNORE INTO rlec_scenarios (source_kind, source_ref, title, domain, subdomain, place, situation, cefr, difficulty, role_a, role_b, learner_role_default, goal, context_brief, expected_vocab_json, useful_phrases_json, grammar_targets_json, likely_questions_json, likely_problems_json, unexpected_challenge, cultural_notes, safety_notes, model_instructions, correction_policy, status, created_by) VALUES
  ('manual',
   'RLEC-PILOT-06',
   'Airport check-in: flight delayed, rebooking',
   'travel',
   'airport',
   'Airline check-in counter, international airport',
   'You check in for an international flight. The agent tells you the flight is delayed and you may miss your connection.',
   'A2',
   2,
   'Mark — airline check-in agent',
   'Rina — passenger flying to Melbourne via Singapore',
   'role_b',
   'Check in, understand the delay, ask about your connecting flight, and get a new booking.',
   'Your flight to Singapore leaves at 10:00. Your connection to Melbourne leaves Singapore at 14:30. You have one suitcase.',
   '["passport", "boarding pass", "suitcase", "delayed", "connecting flight", "gate", "seat", "rebook", "overweight", "departure"]',
   '["Hi, I''d like to check in, please.", "Here is my passport.", "How long is the delay?", "Will I miss my connecting flight?", "Can you put me on another flight?", "Is there an extra charge?", "Could you write the new time for me, please?"]',
   '["Questions with will/can (Will I miss my flight? Can you help me?)", "Simple past to report what happened (They told me it was delayed.)"]',
   '["Where are you flying today?", "Can I see your passport, please?", "How many bags are you checking in?", "Would you like a window or aisle seat?", "Is this your only bag?"]',
   '["Your suitcase is 3 kilos overweight.", "The next flight is full."]',
   'The agent says: "I''m sorry, the flight is delayed by three hours. You will miss your connection in Singapore."',
   'Petugas maskapai biasanya ramah tapi cepat; tanyakan pilihan dengan jelas dan minta ditulis.',
   'Everyday scenario. Fictional people and places.',
   'ROLE: You are Mark (airline check-in agent). Never switch roles and never speak for the learner. SCENARIO: You work at an airline check-in counter. Be polite and quick. Offer real options when there is a problem. If the learner goes off-topic, steer back politely in one sentence. LEVEL: A2: very short sentences (max 12 words), everyday words, present and simple past only, one question per turn. Do not use Indonesian.',
   'beginner',
   'pilot',
   'hermes');

INSERT OR IGNORE INTO rlec_scenarios (source_kind, source_ref, title, domain, subdomain, place, situation, cefr, difficulty, role_a, role_b, learner_role_default, goal, context_brief, expected_vocab_json, useful_phrases_json, grammar_targets_json, likely_questions_json, likely_problems_json, unexpected_challenge, cultural_notes, safety_notes, model_instructions, correction_policy, status, created_by) VALUES
  ('manual',
   'RLEC-PILOT-07',
   'Hotel check-in: room AC broken, request a change',
   'travel',
   'hotel',
   'Hotel front desk, then a phone call from the room',
   'You check in at a hotel. Later you find the air conditioner in your room does not work and you ask for another room.',
   'A2',
   2,
   'Anna — hotel receptionist',
   'Hendry — hotel guest staying for three nights',
   'role_b',
   'Check in, then report the broken AC politely and get a room change or a quick fix.',
   'You booked a double room for three nights online. It is hot outside. You arrive at 3 p.m.',
   '["reservation", "check in", "key card", "air conditioner", "broken", "room change", "floor", "breakfast", "receipt", "upgrade"]',
   '["Hi, I have a reservation under the name Hendry.", "What time is breakfast?", "The air conditioner in my room doesn''t work.", "It''s very hot in the room.", "Could I change to another room, please?", "How long will it take?", "Thank you for your help."]',
   '["Present simple negative (It doesn''t work.)", "Polite requests with could (Could I change rooms?)"]',
   '["Can I see your passport, please?", "How many nights are you staying?", "Would you like breakfast?", "What is the problem with the room?", "Can our technician come in ten minutes?"]',
   '["Your room is not ready yet when you arrive.", "The hotel is full and there is no other room."]',
   'Anna says: "I''m sorry, your room is not ready yet. Can you wait one hour?"',
   'Komplain di hotel: sopan, jelaskan masalah, minta solusi spesifik.',
   'Everyday scenario. Fictional people and places.',
   'ROLE: You are Anna (hotel receptionist). Never switch roles and never speak for the learner. SCENARIO: You are a receptionist at a city hotel. Be friendly. Solve problems step by step. If the learner goes off-topic, steer back politely in one sentence. LEVEL: A2: very short sentences (max 12 words), everyday words, present and simple past only, one question per turn. Do not use Indonesian.',
   'beginner',
   'pilot',
   'hermes');

INSERT OR IGNORE INTO rlec_scenarios (source_kind, source_ref, title, domain, subdomain, place, situation, cefr, difficulty, role_a, role_b, learner_role_default, goal, context_brief, expected_vocab_json, useful_phrases_json, grammar_targets_json, likely_questions_json, likely_problems_json, unexpected_challenge, cultural_notes, safety_notes, model_instructions, correction_policy, status, created_by) VALUES
  ('manual',
   'RLEC-PILOT-08',
   'Online team meeting: short status update',
   'workplace',
   'meeting',
   'Online video meeting',
   'In the weekly online meeting, your manager asks you for a short update on your project. She asks for a number that is not ready yet.',
   'B1',
   3,
   'Helen Carter — project manager leading the weekly meeting',
   'Rina — team member responsible for the training project',
   'role_b',
   'Give a clear 1-minute update (done, in progress, next), ask one clarifying question, and buy time politely for the missing number.',
   'Your project: a staff English training program. Done: schedule. In progress: trainer contracts. Not ready: the final budget number.',
   '["update", "on track", "behind schedule", "deadline", "budget", "figure", "to follow up", "by Friday", "next step", "to clarify"]',
   '["Here''s a quick update on the training project.", "We have finished the schedule.", "We''re still working on the trainer contracts.", "I don''t have the exact figure yet.", "Can I get back to you by Friday?", "Just to clarify, do you mean...?", "Our next step is..."]',
   '["Present perfect for completed work (We have finished the schedule.)", "Present continuous for work in progress (We are still working on...)"]',
   '["Are you on track for the deadline?", "What is the total budget?", "What is blocking you?", "Do you need help from anyone?", "When can we see the final plan?"]',
   '["Your internet connection is unstable and you must ask someone to repeat.", "Another colleague disagrees with your timeline."]',
   'Helen says: "Thanks. But I need the final budget number now for the director. What is it?"',
   'Dalam rapat internasional, boleh jujur "belum ada angkanya" asal memberi tenggat yang jelas.',
   'Everyday scenario. Fictional people and places.',
   'ROLE: You are Helen Carter (project manager leading the weekly meeting). Never switch roles and never speak for the learner. SCENARIO: You run a weekly online team meeting. Keep it short and professional. Push gently for clear answers. If the learner goes off-topic, steer back politely in one sentence. LEVEL: B1: short clear sentences, common words, explain any technical word in simple English, one question per turn. Do not use Indonesian.',
   'intermediate',
   'pilot',
   'hermes');

INSERT OR IGNORE INTO rlec_scenarios (source_kind, source_ref, title, domain, subdomain, place, situation, cefr, difficulty, role_a, role_b, learner_role_default, goal, context_brief, expected_vocab_json, useful_phrases_json, grammar_targets_json, likely_questions_json, likely_problems_json, unexpected_challenge, cultural_notes, safety_notes, model_instructions, correction_policy, status, created_by) VALUES
  ('manual',
   'RLEC-PILOT-09',
   'Café lunch: ordering, and the wrong order arrives',
   'daily_life',
   'cafe',
   'A busy café near your office',
   'You have lunch with a foreign guest. You order food and drinks, and then the waiter brings the wrong dish.',
   'A2',
   1,
   'Tom — waiter at the café',
   'Hendry — customer having lunch with a guest',
   'role_b',
   'Order food and drinks for two, ask one question about the menu, and complain politely when the wrong dish arrives.',
   'You want a chicken salad and an iced tea. Your guest wants a vegetarian pasta and water. You have about 45 minutes.',
   '["menu", "order", "vegetarian", "spicy", "dish", "bill", "iced tea", "no sugar", "wrong order", "takeaway"]',
   '["Could we see the menu, please?", "I''d like the chicken salad, please.", "Is this dish spicy?", "Can I have it without sugar?", "Excuse me, I''m afraid this isn''t what I ordered.", "I ordered the chicken salad.", "Could we have the bill, please?"]',
   '["Would like for ordering (I''d like..., Would you like...?)", "Simple past to explain what you ordered (I ordered the salad.)"]',
   '["Are you ready to order?", "What would you like to drink?", "Would you like anything else?", "How is everything?", "Would you like to pay by card or cash?"]',
   '["The dish you want is sold out.", "The bill has an item you did not order."]',
   'Tom brings a beef burger instead of the chicken salad and says: "Here you are, enjoy your meal!"',
   '"I''m afraid this isn''t what I ordered" adalah cara komplain yang sopan dan umum.',
   'Everyday scenario. Fictional people and places.',
   'ROLE: You are Tom (waiter at the café). Never switch roles and never speak for the learner. SCENARIO: You are a friendly waiter in a busy café. Speak simply. Make one mistake with the order when the challenge says so. If the learner goes off-topic, steer back politely in one sentence. LEVEL: A2: very short sentences (max 12 words), everyday words, present and simple past only, one question per turn. Do not use Indonesian.',
   'beginner',
   'pilot',
   'hermes');

INSERT OR IGNORE INTO rlec_scenarios (source_kind, source_ref, title, domain, subdomain, place, situation, cefr, difficulty, role_a, role_b, learner_role_default, goal, context_brief, expected_vocab_json, useful_phrases_json, grammar_targets_json, likely_questions_json, likely_problems_json, unexpected_challenge, cultural_notes, safety_notes, model_instructions, correction_policy, status, created_by) VALUES
  ('manual',
   'RLEC-PILOT-10',
   'Ride-hailing: wrong route and pickup point confusion',
   'travel',
   'ride_hailing',
   'Phone call with the driver, then inside the car',
   'You booked a ride to a meeting in another part of the city. The driver cannot find you, and later he takes a different route.',
   'A2',
   2,
   'Ahmed — ride-hailing driver who speaks English, new to the city',
   'Rina — passenger going to a meeting',
   'role_b',
   'Explain where you are waiting, confirm the destination, and politely ask the driver to change the route.',
   'You are waiting at the main gate of a shopping mall. Your meeting is at the City Office Tower at 2 p.m. You have 40 minutes.',
   '["pickup point", "main gate", "landmark", "destination", "route", "traffic", "turn left", "turn right", "drop me off", "meter"]',
   '["Hi, I''m waiting at the main gate, next to the bank.", "I''m wearing a blue shirt.", "Could you drop me at the City Office Tower?", "Is this the right way?", "Could you use the toll road, please?", "I''m in a bit of a hurry.", "You can drop me off here, thank you."]',
   '["Present continuous for where you are now (I''m waiting at..., I''m wearing...)", "Imperatives and polite requests for directions (Turn left, please. Could you...?)"]',
   '["Where are you exactly?", "What are you wearing?", "Is the address correct in the app?", "Which way do you prefer?", "Where should I stop?"]',
   '["The pin in the app is on the wrong side of the building.", "There is heavy traffic on the route the driver chose."]',
   'The driver says: "I am at the back gate, near the parking lot. I don''t see you. Where are you?"',
   'Gunakan landmark (bank, minimarket, pos satpam) saat menjelaskan lokasi.',
   'Everyday scenario. Fictional people and places.',
   'ROLE: You are Ahmed (ride-hailing driver who speaks English, new to the city). Never switch roles and never speak for the learner. SCENARIO: You are a ride-hailing driver. At first you cannot find the passenger, then you take a different route. Speak simply. If the learner goes off-topic, steer back politely in one sentence. LEVEL: A2: very short sentences (max 12 words), everyday words, present and simple past only, one question per turn. Do not use Indonesian.',
   'beginner',
   'pilot',
   'hermes');
