const webPushStub='data:text/javascript,export default {sendNotification:async(...args)=>{globalThis.__testPushCalls??=[];globalThis.__testPushCalls.push(args);if(globalThis.__testPushFailure)throw globalThis.__testPushFailure;return{};}};';
export async function resolve(specifier,context,nextResolve){
  if(specifier==='web-push')return {url:webPushStub,shortCircuit:true};
  return nextResolve(specifier,context);
}
