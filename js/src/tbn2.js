async function fetchDataMetadir(path, pfs, dir) {

  var restext = undefined

  try {

    const { REACT_APP_BUILD_MODE } = process.env;

    if (REACT_APP_BUILD_MODE === "local") {
      // fetch cache
      var res = await fetch(`/api/` + path)
      restext = await res.text()
    } else {
      // check if path exists in the repo
      var path_elements = path.split('/')
      var root = dir
      for (var i=0; i < path_elements.length; i++) {
        let path_element = path_elements[i]
        var files = await pfs.readdir(root);
        // console.log(files)
        if (files.includes(path_element)) {
          root += '/' + path_element
          // console.log(`${root} has ${path_element}`)
        } else {
          console.error(`Cannot load file. Ensure there is a file called ${path_element} in ${root}.`);
          break
        }
      }
      restext = new TextDecoder().decode(await pfs.readFile(dir + '/' + path));
      // console.log("fetch file:", path, restext)
    }

  } catch (e) {
    console.error(e)
  }

  return restext

}

async function digestMessage(message) {
  const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // hash as buffer
  const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  return hashHex;
}

async function digestRandom() {
  return await digestMessage(crypto.randomUUID())
}

export {
  fetchDataMetadir,
  digestMessage,
  digestRandom
}
