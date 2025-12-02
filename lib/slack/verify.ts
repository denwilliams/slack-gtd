import crypto from 'crypto';

export function verifySlackRequest(
  signingSecret: string,
  requestSignature: string,
  timestamp: string,
  body: string
): boolean {
  // Reject old requests (older than 5 minutes)
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp) < fiveMinutesAgo) {
    return false;
  }

  // Compute the signature
  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature =
    'v0=' +
    crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex');

  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(mySignature, 'utf8'),
    Buffer.from(requestSignature, 'utf8')
  );
}
