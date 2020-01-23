export const createFolfer = path => {
  const baseUrl = "";
  path.split("/").forEach(pathEl => {
    if (!fs.existsSync(`${baseUrl}/${pathEl}`)) {
      fs.mkdirSync(`temp/${town.url}`);
    }
    baseUrl += `/${pathEl}`;
  });
  return;
};
