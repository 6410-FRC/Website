/**
 * Where the site reads its content from. Normally the repo itself; when the admin starts a
 * preview server it sets WINGNUTS_PREVIEW=1 and the server reads the draft mirror instead.
 */
export const isPreviewServer = process.env.WINGNUTS_PREVIEW === '1';
export const contentRoot = isPreviewServer ? '.local/preview' : '.';
export const fromRoot = (relative: string) => (contentRoot === '.' ? relative : `${contentRoot}/${relative}`);
