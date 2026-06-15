const MAX_FIELD_LENGTH = 4000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8'
    }
  });
}

function clean(value) {
  return String(value || '').trim().slice(0, MAX_FIELD_LENGTH);
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function onRequestOptions() {
  return json({ ok: true });
}

export async function onRequestPost(context) {
  const env = context.env || {};

  if (!env.RESEND_API_KEY) {
    return json({ ok: false, error: 'Contact form is not configured yet.' }, 500);
  }

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return json({ ok: false, error: 'Invalid form submission.' }, 400);
  }

  const name = clean(payload.name);
  const email = clean(payload.email);
  const company = clean(payload.company);
  const service = clean(payload.service);
  const message = clean(payload.message);
  const website = clean(payload.website);

  if (website) return json({ ok: true });
  if (!name || !validEmail(email) || !message) {
    return json({ ok: false, error: 'Please add your name, a valid email, and a message.' }, 400);
  }

  const to = env.CONTACT_TO_EMAIL || 'hello@kayco.net';
  const from = env.CONTACT_FROM_EMAIL || 'Kay & Co. <hello@kayco.net>';
  const subject = `New Kay & Co. enquiry from ${name}`;
  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company || '-'}`,
    `Service: ${service || '-'}`,
    '',
    message
  ].join('\n');

  const html = `
    <h2>New Kay &amp; Co. enquiry</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Company:</strong> ${escapeHtml(company || '-')}</p>
    <p><strong>Service:</strong> ${escapeHtml(service || '-')}</p>
    <hr>
    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
  `;

  const resend = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: email,
      subject,
      text,
      html
    })
  });

  if (!resend.ok) {
    return json({ ok: false, error: 'The form could not be sent. Please email hello@kayco.net.' }, 502);
  }

  return json({ ok: true });
}
