const ok=(data)=>({success:true,data});const fail=(error,code='BAD_REQUEST')=>({success:false,error,code});module.exports={ok,fail};
