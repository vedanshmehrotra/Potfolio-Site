// The inspection page reuses the approved cat in its studio iframe.
export async function mountCat(doc,onChange=()=>{}) {
  const win=doc.defaultView;
  await new Promise((resolve,reject)=>{
    let poll;
    const timeout=win.setTimeout(()=>{win.clearTimeout(poll);reject(new Error('Studio cat did not finish loading.'));},12000);
    const check=()=>{
      if(win.studioCat){win.clearTimeout(timeout);return resolve();}
      if(win.studioCatError){win.clearTimeout(timeout);return reject(new Error(win.studioCatError));}
      poll=win.setTimeout(check,30);
    };check();
  });
  win.studioCat.subscribe(onChange);return win.studioCat;
}
