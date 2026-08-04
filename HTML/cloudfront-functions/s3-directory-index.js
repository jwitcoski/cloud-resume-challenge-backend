/**
 * CloudFront Function (viewer request).
 * Attach to witcoskitech.com distribution so /path/ resolves to /path/index.html on S3.
 *
 * IMPORTANT: Flat files like /playground/demo.html work as-is, but extensionless
 * /playground/demo is rewritten to /playground/demo/index.html — so demos must
 * ship as demo/index.html (postbuild-s3.mjs also emits demo.html aliases).
 *
 * AWS Console: CloudFront > Functions > Create > paste this code > Publish
 * Then: Distribution > Behaviors > Edit > Function associations > Viewer request
 */
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith("/")) {
    request.uri += "index.html";
  } else if (!uri.includes(".")) {
    request.uri += "/index.html";
  }

  return request;
}
