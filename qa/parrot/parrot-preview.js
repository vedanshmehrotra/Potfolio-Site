// The review uses the real studio's approved instance, rather than a duplicate.
export async function mountParrot(doc,onChange=()=>{}) {
  const win=doc.defaultView;
  await new Promise((resolve,reject)=>{
    const check=()=>{
      if(win.studioParrot){clearTimeout(timeout);return resolve();}
      if(win.studioParrotError){clearTimeout(timeout);return reject(new Error(win.studioParrotError));}
      win.setTimeout(check,30);
    };
    const timeout=win.setTimeout(()=>reject(new Error('Studio parrot did not finish loading.')),12000);
    check();
  });
  win.studioParrot.subscribe(onChange);
  return win.studioParrot;
}
