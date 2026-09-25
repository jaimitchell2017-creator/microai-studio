(() => {
  const C = window.MICROAI_CONFIG;
  const { createClient } = window.supabase;
  const supabase = createClient(C.SUPABASE_URL, C.SUPABASE_PUBLISHABLE_KEY);

  const $ = (id) => document.getElementById(id);
  const state = {
    session:null,user:null,model:null,cameraStream:null,loop:null,predictions:[],
    modelUrl:"", mappings:[], projectId:null, projectName:"My First MicroAI Project",
    currentCode:"makecode", bluetooth:null, rx:null, connected:false, authSignup:false
  };

  const defaultMappings = [
    {class:"HAPPY", command:"HAPPY"},
    {class:"SAD", command:"SAD"},
    {class:"MAYBE", command:"MAYBE"}
  ];

  function toast(message){
    const t=$("toast"); t.textContent=message; t.classList.add("show");
    clearTimeout(window.__toast); window.__toast=setTimeout(()=>t.classList.remove("show"),2600);
  }
  function esc(s=""){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
  function emojiFor(name=""){
    const n=name.toLowerCase();
    if(n.includes("happy")||n.includes("up")||n.includes("yes")||n.includes("good")) return "☺";
    if(n.includes("sad")||n.includes("down")||n.includes("no")) return "☹";
    if(n.includes("maybe")||n.includes("confus")) return "◔";
    if(n.includes("clear")) return "⌫";
    return "●";
  }
  function projectData(){
    return {modelUrl:$("modelUrl").value.trim(), mappings:state.mappings, projectName:state.projectName, codePreference:state.currentCode};
  }

  function setCloudStatus(online){
    const p=$("connectionPill");
    p.classList.toggle("online",online);
    p.querySelector("span").textContent=online?"Cloud connected":"Cloud offline";
    $("userLabel").textContent=state.user?.email?.split("@")[0] || "Local mode";
    $("userSub").textContent=state.user?"Cloud sync enabled":"Sign in for cloud sync";
    $("authButton").textContent=state.user?"Sign out":"Sign in";
  }

  function renderMappings(){
    const list=$("mappingList");
    if(!state.mappings.length){list.innerHTML='<div class="small-message">Load a model to create class mappings, or add one manually.</div>';return}
    list.innerHTML=state.mappings.map((m,i)=>`
      <div class="mapping-row">
        <input data-map-class="${i}" value="${esc(m.class)}" aria-label="Class name">
        <div class="mapping-arrow">→</div>
        <select data-map-command="${i}">
          ${["HAPPY","SAD","MAYBE","CLEAR","HELLO","HEART","UP","DOWN","LEFT","RIGHT","TEXT"].map(x=>`<option ${m.command===x?"selected":""}>${x}</option>`).join("")}
        </select>
        <button class="icon-btn" data-map-remove="${i}" title="Remove">×</button>
      </div>`).join("");
    list.querySelectorAll("[data-map-class]").forEach(el=>el.oninput=()=>state.mappings[+el.dataset.mapClass].class=el.value.toUpperCase());
    list.querySelectorAll("[data-map-command]").forEach(el=>el.onchange=()=>{state.mappings[+el.dataset.mapCommand].command=el.value;renderCode()});
    list.querySelectorAll("[data-map-remove]").forEach(el=>el.onclick=()=>{state.mappings.splice(+el.dataset.mapRemove,1);renderMappings();renderCode()});
  }

  function renderCode(){
    const maps=state.mappings.length?state.mappings:[{class:"HAPPY",command:"HAPPY"},{class:"SAD",command:"SAD"},{class:"MAYBE",command:"MAYBE"}];
    let code;
    if(state.currentCode==="makecode"){
      code=`// MicroAI Studio — micro:bit Bluetooth receiver
// Flash this with MakeCode (JavaScript).

bluetooth.startUartService()

function showCommand(command: string) {
    if (command == "HAPPY") {
        basic.showIcon(IconNames.Happy)
    } else if (command == "SAD") {
        basic.showIcon(IconNames.Sad)
    } else if (command == "MAYBE") {
        basic.showIcon(IconNames.Confused)
    } else if (command == "HELLO") {
        basic.showString("HI")
    } else if (command == "HEART") {
        basic.showIcon(IconNames.Heart)
    } else if (command == "CLEAR") {
        basic.clearScreen()
    } else if (command == "UP") {
        basic.showArrow(ArrowNames.North)
    } else if (command == "DOWN") {
        basic.showArrow(ArrowNames.South)
    } else if (command == "LEFT") {
        basic.showArrow(ArrowNames.West)
    } else if (command == "RIGHT") {
        basic.showArrow(ArrowNames.East)
    } else {
        basic.showString(command)
    }
}

bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    showCommand(bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine)))
})

// Mapped classes in MicroAI Studio:
// ${maps.map(m=>`// ${m.class} → ${m.command}`).join("\\n")}`;
    } else {
      code=`# MicroAI Studio — micro:bit Bluetooth receiver
# MicroPython / micro:bit runtime
from microbit import *
import bluetooth

# Pair/connect using a BLE UART-capable micro:bit firmware.
# Your BLE UART service should forward newline-delimited commands.

def show_command(command):
    if command == "HAPPY":
        display.show(Image.HAPPY)
    elif command == "SAD":
        display.show(Image.SAD)
    elif command == "MAYBE":
        display.show(Image.CONFUSED)
    elif command == "HEART":
        display.show(Image.HEART)
    elif command == "CLEAR":
        display.clear()
    elif command == "UP":
        display.show(Image.ARROW_N)
    elif command == "DOWN":
        display.show(Image.ARROW_S)
    elif command == "LEFT":
        display.show(Image.ARROW_W)
    elif command == "RIGHT":
        display.show(Image.ARROW_W)
    else:
        display.scroll(command)

# Mapped classes:
${maps.map(m=>`# ${m.class} -> ${m.command}`).join("\\n")}

# Bluetooth UART setup depends on the MicroPython BLE UART
# library/firmware used on your micro:bit.
`;
    }
    $("codeOutput").textContent=code;
  }

  function renderPredictions(preds){
    if(!preds.length)return;
    const sorted=[...preds].sort((a,b)=>b.probability-a.probability);
    const top=sorted[0];
    const pct=Math.round(top.probability*100);
    $("predictionName").textContent=top.className;
    $("predictionEmoji").textContent=emojiFor(top.className);
    $("confidenceValue").textContent=pct+"%";
    $("confidenceBar").style.width=pct+"%";
    $("classList").innerHTML=sorted.map(p=>`<div class="class-row"><div><div class="label">${esc(p.className)}</div><div class="bar"><span style="width:${Math.round(p.probability*100)}%"></span></div></div><div class="pct">${Math.round(p.probability*100)}%</div></div>`).join("");
    $("sendNowBtn").onclick=()=>sendMapped(top.className,true);
    if(pct>=70) sendMapped(top.className,false);
  }

  let lastSentClass="",lastSentAt=0;
  function findMapping(cls){
    const exact=state.mappings.find(m=>m.class.trim().toLowerCase()===cls.trim().toLowerCase());
    if(exact)return exact.command;
    const contains=state.mappings.find(m=>cls.toLowerCase().includes(m.class.trim().toLowerCase()));
    return contains?.command || null;
  }
  async function sendMapped(cls,manual){
    const command=findMapping(cls);
    if(!command){ if(manual) toast("No mapping for "+cls); return; }
    const now=Date.now();
    if(!manual && cls===lastSentClass && now-lastSentAt<900)return;
    lastSentClass=cls;lastSentAt=now;
    $("lastAction").textContent=`${cls} → ${command}`;
    $("mbFace").textContent=emojiFor(command);
    $("bitCommand").textContent=`Last command: ${command}`;
    if(state.rx && state.connected){
      try{await state.rx.writeValue(new TextEncoder().encode(command+"\\n"));toast("Sent "+command)}catch(e){toast("Bluetooth write failed")}
    } else if(manual){toast("Action previewed — connect a micro:bit to send it")}
  }

  async function loadModel(){
    const url=$("modelUrl").value.trim();
    if(!url){toast("Paste your Teachable Machine model URL first");return}
    try{
      $("modelStatus").textContent="Loading…";
      $("modelStatus").className="badge neutral";
      state.model=await tmImage.load(url.replace(/\/?$/,"/model.json"),url.replace(/\/?$/,"/metadata.json"));
      const labels=state.model.getClassLabels();
      state.mappings=labels.map(label=>({class:label,command:defaultMappings.find(x=>x.class.toLowerCase()===label.toLowerCase())?.command||"HAPPY"}));
      renderMappings(); renderCode();
      $("modelStatus").textContent=`${labels.length} classes`;
      $("modelStatus").className="badge good";
      toast("Model loaded — "+labels.length+" classes");
    }catch(e){
      console.error(e); state.model=null; $("modelStatus").textContent="Load failed"; $("modelStatus").className="badge neutral";
      toast("Couldn't load that model URL");
    }
  }

  async function startCamera(){
    if(!state.model){toast("Load a Teachable Machine model first");return}
    try{
      state.cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});
      $("camera").srcObject=state.cameraStream; $("camera").style.display="block"; $("cameraPlaceholder").style.display="none";
      $("cameraState").textContent="LIVE"; $("cameraOverlay").classList.add("live");
      $("startCameraBtn").disabled=true;
      const predict=async()=>{
        if(!state.model||!state.cameraStream)return;
        try{const preds=await state.model.predict($("camera")); state.predictions=preds;renderPredictions(preds)}catch(e){}
        state.loop=requestAnimationFrame(predict);
      };
      predict();
    }catch(e){toast("Camera permission was blocked or unavailable")}
  }
  function stopCamera(){
    if(state.loop)cancelAnimationFrame(state.loop); state.loop=null;
    state.cameraStream?.getTracks().forEach(t=>t.stop()); state.cameraStream=null;
    $("camera").srcObject=null;$("camera").style.display="none";$("cameraPlaceholder").style.display="flex";
    $("cameraState").textContent="IDLE";$("cameraOverlay").classList.remove("live");$("startCameraBtn").disabled=false;
  }

  async function connectBluetooth(){
    if(!navigator.bluetooth){toast("Web Bluetooth isn't available in this browser");return}
    try{
      const device=await navigator.bluetooth.requestDevice({filters:[{services:["6e400001-b5a3-f393-e0a9-e50e24dcca9e"]}],optionalServices:["6e400001-b5a3-f393-e0a9-e50e24dcca9e"]});
      const server=await device.gatt.connect();
      const service=await server.getPrimaryService("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
      state.rx=await service.getCharacteristic("6e400002-b5a3-f393-e0a9-e50e24dcca9e");
      state.bluetooth=device;state.connected=true;
      $("bitStatus").textContent="Connected";$("bitStatus").className="badge good";$("bitName").textContent=device.name||"micro:bit";
      device.addEventListener("gattserverdisconnected",disconnectBluetooth);
      toast("micro:bit connected");
      if(state.user) await supabase.from("microbit_devices").insert({user_id:state.user.id,name:device.name||"My micro:bit",bluetooth_name:device.name||null,device_identifier:device.id,last_connected_at:new Date().toISOString()});
    }catch(e){console.error(e);toast("micro:bit connection cancelled or failed")}
  }
  function disconnectBluetooth(){
    try{state.bluetooth?.gatt?.disconnect()}catch(e){}
    state.bluetooth=null;state.rx=null;state.connected=false;
    $("bitStatus").textContent="Disconnected";$("bitStatus").className="badge neutral";$("bitName").textContent="No device connected";
  }

  async function saveProject(){
    const data=projectData();
    if(!state.user){localStorage.setItem("microai-local-project",JSON.stringify(data));toast("Saved locally — sign in for cloud sync");return}
    try{
      if(state.projectId){
        const {error}=await supabase.from("projects").update({name:state.projectName,project_data:data,model_url:data.modelUrl,last_opened_at:new Date().toISOString()}).eq("id",state.projectId);
        if(error)throw error;
      }else{
        const {data:row,error}=await supabase.from("projects").insert({user_id:state.user.id,name:state.projectName,project_data:data,model_url:data.modelUrl,last_opened_at:new Date().toISOString()}).select().single();
        if(error)throw error; state.projectId=row.id;
      }
      toast("Project saved to cloud"); loadProjects();
    }catch(e){console.error(e);toast("Cloud save failed")}
  }

  async function loadProjects(){
    const grid=$("projectsGrid");
    if(!state.user){grid.innerHTML='<div class="instruction-card"><h3>Sign in for cloud projects</h3><p>Your projects can also be saved locally in this browser.</p></div>';$("projectCount").textContent="0";return}
    const {data,error}=await supabase.from("projects").select("id,name,description,updated_at,project_data").order("updated_at",{ascending:false});
    if(error){grid.innerHTML='<div class="instruction-card"><h3>Could not load projects</h3><p>Check your Supabase tables and sign-in state.</p></div>';return}
    $("projectCount").textContent=data.length;
    if(!data.length){grid.innerHTML='<div class="instruction-card"><h3>No projects yet</h3><p>Create your first project in AI Lab and press Save project.</p></div>';return}
    grid.innerHTML=data.map(p=>`<div class="project-card"><small>${new Date(p.updated_at).toLocaleString()}</small><h3>${esc(p.name)}</h3><p>${esc(p.description||"MicroAI Studio project")}</p><div class="project-actions"><button class="primary-btn" data-open-project="${p.id}">Open</button><button class="secondary-btn" data-delete-project="${p.id}">Delete</button></div></div>`).join("");
    grid.querySelectorAll("[data-open-project]").forEach(b=>b.onclick=()=>openProject(data.find(x=>x.id===b.dataset.openProject)));
    grid.querySelectorAll("[data-delete-project]").forEach(b=>b.onclick=()=>deleteProject(b.dataset.deleteProject));
  }
  async function openProject(p){
    if(!p)return; state.projectId=p.id;state.projectName=p.name; const d=p.project_data||{};
    $("modelUrl").value=d.modelUrl||p.model_url||""; state.mappings=Array.isArray(d.mappings)?d.mappings:[]; renderMappings();renderCode();
    document.querySelector('[data-panel="lab"]').click(); toast("Opened "+p.name);
  }
  async function deleteProject(id){
    if(!confirm("Delete this project?"))return;
    const {error}=await supabase.from("projects").delete().eq("id",id); if(error){toast("Delete failed");return} if(state.projectId===id)state.projectId=null; loadProjects();toast("Project deleted");
  }

  async function sendAI(prompt){
    if(!state.user){toast("Sign in to use the server AI assistant");return}
    const {data,error}=await supabase.functions.invoke(C.AI_FUNCTION_NAME,{body:{message:prompt,project:projectData()}});
    if(error)throw error;
    return data?.text||"No response returned.";
  }
  function addChat(role,text){
    const box=$("chatMessages"), row=document.createElement("div"); row.className="chat-msg "+role;
    row.innerHTML=`<div class="avatar">${role==="ai"?"✦":"●"}</div><div><b>${role==="ai"?"MicroAI":"You"}</b><p>${esc(text)}</p></div>`;
    box.appendChild(row);box.scrollTop=box.scrollHeight;
  }

  async function handleAuth(e){
    e.preventDefault(); const email=$("authEmail").value.trim(),pass=$("authPassword").value,name=$("authName").value.trim();
    $("authMessage").textContent="Working…";
    try{
      if(state.authSignup){
        const {data,error}=await supabase.auth.signUp({email,password:pass,options:{data:{display_name:name||email.split("@")[0]}}}); if(error)throw error;
        $("authMessage").textContent=data.session?"Account created and signed in.":"Account created. Check your email if confirmation is required.";
      }else{
        const {error}=await supabase.auth.signInWithPassword({email,password:pass});if(error)throw error;
        $("authMessage").textContent="Signed in.";
      }
    }catch(err){$("authMessage").textContent=err.message}
  }

  function newProject(){
    state.projectId=null;state.projectName="Untitled MicroAI Project";$("modelUrl").value="";state.mappings=[];renderMappings();renderCode();document.querySelector('[data-panel="lab"]').click();toast("New project ready");
  }

  function loadDemo(){
    state.projectId=null;state.projectName="Thumbs Up / Down Robot";$("modelUrl").value="";state.mappings=[{class:"HAPPY",command:"HAPPY"},{class:"SAD",command:"SAD"},{class:"MAYBE",command:"MAYBE"}];renderMappings();renderCode();document.querySelector('[data-panel="lab"]').click();toast("Demo mapping loaded — paste your model URL");
  }

  document.querySelectorAll(".nav-item").forEach(btn=>btn.onclick=()=>{
    document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
    document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));$("panel-"+btn.dataset.panel).classList.add("active");
    if(btn.dataset.panel==="projects")loadProjects();
  });
  $("scrollStudioBtn").onclick=()=>document.getElementById("studio").scrollIntoView({behavior:"smooth"});
  $("newProjectBtn").onclick=newProject;$("demoBtn").onclick=loadDemo;$("loadModelBtn").onclick=loadModel;$("startCameraBtn").onclick=startCamera;$("stopCameraBtn").onclick=stopCamera;
  $("connectBitBtn").onclick=connectBluetooth;$("disconnectBitBtn").onclick=disconnectBluetooth;
  $("clearBitBtn").onclick=async()=>{ $("mbFace").textContent=""; $("bitCommand").textContent="Last command: CLEAR"; if(state.rx&&state.connected)await state.rx.writeValue(new TextEncoder().encode("CLEAR\\n"));};
  $("saveProjectBtn").onclick=saveProject;$("refreshProjectsBtn").onclick=loadProjects;$("addMappingBtn").onclick=()=>{state.mappings.push({class:"NEW",command:"HAPPY"});renderMappings();renderCode()};
  $("copyCodeBtn").onclick=()=>navigator.clipboard.writeText($("codeOutput").textContent).then(()=>toast("Code copied"));
  document.querySelectorAll(".code-tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".code-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.currentCode=b.dataset.code;renderCode()});
  $("authButton").onclick=()=>{if(state.user){supabase.auth.signOut()}else{$("authCard").classList.remove("hidden");$("authEmail").focus()}};
  $("closeAuth").onclick=()=>$("authCard").classList.add("hidden");
  $("toggleAuthMode").onclick=()=>{state.authSignup=!state.authSignup;$("authForm").classList.toggle("signup",state.authSignup);$("authTitle").textContent=state.authSignup?"Create your MicroAI account":"Sign in to sync your studio";$("authSubmit").textContent=state.authSignup?"Create account":"Sign in";$("toggleAuthMode").textContent=state.authSignup?"I already have an account":"Create account"};
  $("authForm").onsubmit=handleAuth;
  document.querySelectorAll(".assistant-hints button").forEach(b=>b.onclick=()=>{$("chatInput").value=b.dataset.prompt;$("chatInput").focus()});
  $("chatForm").onsubmit=async(e)=>{e.preventDefault();const input=$("chatInput"),p=input.value.trim();if(!p)return;input.value="";addChat("user",p);addChat("ai","Thinking…");const last=$("chatMessages").lastElementChild;try{const answer=await sendAI(p);last.querySelector("p").textContent=answer}catch(err){last.querySelector("p").textContent="I couldn't reach the AI function. Make sure the microai-chat Edge Function is deployed and OPENAI_API_KEY is set."}};

  supabase.auth.onAuthStateChange((_event,session)=>{
    state.session=session;state.user=session?.user||null;setCloudStatus(!!state.user);if(state.user){$("authCard").classList.add("hidden");loadProjects()}else{state.projectId=null}
  });
  (async()=>{
    const {data}=await supabase.auth.getSession();state.session=data.session;state.user=data.session?.user||null;setCloudStatus(!!state.user);
    const local=localStorage.getItem("microai-local-project");
    if(local&&!state.user){try{const d=JSON.parse(local);$("modelUrl").value=d.modelUrl||"";state.mappings=d.mappings||[]}catch(e){}}
    renderMappings();renderCode();
  })();
})();