export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === 'kayco.net') {
    url.hostname = 'www.kayco.net';
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
