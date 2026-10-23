(() => {
  const status=document.querySelector('#desk-status'),form=document.querySelector('form');const token=new URLSearchParams(location.search).get('token');
  history.replaceState(null,'','/admin/reset.html');
  if(!token){status.textContent='This password link is missing or expired. Request another from the owner desk.';form.hidden=true;return;}
  form.onsubmit=async event=>{
    event.preventDefault();const password=document.querySelector('#password'),confirm=document.querySelector('#confirm-password');
    if(password.value.length<14||password.value.length>128){status.textContent='Use a password between 14 and 128 characters.';password.focus();return;}
    if(password.value!==confirm.value){status.textContent='The two passwords do not match.';confirm.focus();return;}
    const button=form.querySelector('button');button.disabled=true;
    try{const response=await fetch('/api/auth/reset-password',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,newPassword:password.value})});if(!response.ok)throw new Error();form.reset();form.hidden=true;status.innerHTML='Password saved. <a href="/admin">Sign in to the owner desk →</a>';}
    catch{status.textContent='The link could not be used. Request a fresh password link from the owner desk.';}finally{button.disabled=false;}
  };
})();
