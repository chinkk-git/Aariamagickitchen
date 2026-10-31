const webPushStub='data:text/javascript,export default {sendNotification:async()=>({})};';
export async function resolve(specifier,context,nextResolve){
  if(specifier==='web-push')return {url:webPushStub,shortCircuit:true};
  return nextResolve(specifier,context);
}
