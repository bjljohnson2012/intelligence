/** Allowed / refused / unknown lines. Figures come from the pack rules, not from a draft. */

const RULES = [
  {
    test: /78[, ]?000|\b78000\b/i,
    status: 'refused',
    answer: 'Held · R9. No figure until a go decision.',
    owner: 'R9',
  },
  {
    test: /90[, ]?000|\b90k\b|55[, ]?000|\b55k\b/i,
    status: 'refused',
    answer: 'Those two customer counts conflict. Do not say either one as the fact. Keep the conflict only.',
    owner: 'R1',
  },
  {
    test: /52\s*%|\b2x\b|61\s*%/i,
    status: 'refused',
    answer: 'Those outcome stats have no n, date, or method. They are not a claim.',
    owner: 'R3',
  },
  {
    test: /38\.1|45\.4/i,
    status: 'refused',
    answer: 'Conversion by motion is Explicit Unknown. n, method, and date are not in this pack.',
    owner: 'R4',
  },
  {
    test: /grow(?:ing)? giving|generosity lift/i,
    status: 'refused',
    answer: 'Refused. 0 of 71 coded reviews name grow giving. Not an Amplify claim.',
    owner: 'R3',
  },
  {
    test: /weeks not months/i,
    status: 'refused',
    answer: 'Refused. Safe Switch is FAIL (R1). Do not say weeks not months.',
    owner: 'R1',
  },
  {
    test: /stevie/i,
    status: 'refused',
    answer: 'Stevie is a Pushpay claim only. Not our proof.',
    owner: 'R3',
  },
  {
    test: /(facebook|instagram).{0,40}follower|follower.{0,40}(facebook|instagram)/i,
    status: 'explicit_unknown',
    answer: 'Facebook and Instagram were not read. No count.',
    owner: 'R9',
  },
];

export function sayCheck(question) {
  const text = String(question || '');
  for (const rule of RULES) {
    if (rule.test.test(text)) {
      return { matched: true, status: rule.status, answer: rule.answer, owner: rule.owner, confidence: 'high' };
    }
  }
  if (/(easier|ease|easy|support)/i.test(text) && /(pco|planning center)/i.test(text)) {
    return {
      matched: true,
      status: 'explicit_unknown',
      answer: 'Unknown. Ease or support versus Planning Center is not an Amplify win. Public reviews n=0 (R3). Buyer language is discovery only.',
      owner: 'R3',
      confidence: 'high',
    };
  }
  if (/amplify/i.test(text) && /(easy|ease|support|real person)/i.test(text)) {
    return {
      matched: true,
      status: 'explicit_unknown',
      answer: 'Current Amplify ease and support are Explicit Unknown. Public reviews n=0 (R3). Buyer language from the 71 reviews is discovery only, not Amplify proof.',
      owner: 'R3',
      confidence: 'high',
    };
  }
  if (/\b(easier|easiest)\b/i.test(text) || /ease of use/i.test(text)) {
    return {
      matched: true,
      status: 'explicit_unknown',
      answer: 'Unknown. Ease is not an Amplify win while public reviews are n=0 (R3). Buyer language is discovery only.',
      owner: 'R3',
      confidence: 'high',
    };
  }
  if (/(can i say|may i say|allowed to say)/i.test(text) && /(easy|ease|real person|one place)/i.test(text)) {
    return {
      matched: true,
      status: 'answered',
      answer: 'Allowed as discovery only. J1 is about 50 of 71. J2 is about 33 of 71. CM2, one coder, rivals and legacy products, not Amplify. Not a win while R3 public n=0.',
      owner: 'R3',
      confidence: 'medium',
    };
  }
  if (/15[, ]?298/.test(text) && /linkedin/i.test(text)) {
    return {
      matched: true,
      status: 'answered',
      answer: 'Allowed. Ministry Brands had 15,298 LinkedIn followers on the 2026-11-04 profile read (SP02). Followers are not reach.',
      owner: 'R3',
      confidence: 'medium',
    };
  }
  if (/\b736\b/.test(text) && /\b(x|twitter)\b/i.test(text)) {
    return {
      matched: true,
      status: 'answered',
      answer: 'Allowed. Ministry Brands had 736 X followers on the 2026-11-04 profile read (SP01). Followers are not reach.',
      owner: 'R3',
      confidence: 'high',
    };
  }
  if (/(can i say|may i say|allowed to say)/i.test(text)) {
    return {
      matched: true,
      status: 'explicit_unknown',
      answer: 'Not a cleared line. Say it only with n, method, confidence, date, and a primary source, or leave it Explicit Unknown.',
      owner: 'R1',
      confidence: 'low',
    };
  }
  return { matched: false, status: '', answer: '', owner: '', confidence: '' };
}
