const source=`export default {
  sendNotification:async(...args)=>{
    if(!globalThis.__testPushCalls)globalThis.__testPushCalls=[];
    globalThis.__testPushCalls.push(args);
    if(globalThis.__testPushFailure)throw globalThis.__testPushFailure;
    return{};
  }
};`;
const webPushStub='data:text/javascript,'+encodeURIComponent(source);
export async function resolve(specifier,context,nextResolve){
  if(specifier==='web-push')return {url:webPushStub,shortCircuit:true};
  return nextResolve(specifier,context);
}
