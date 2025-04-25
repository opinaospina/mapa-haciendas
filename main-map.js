import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { CSS2DRenderer,CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';

const scene = new THREE.Scene();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// LLAMADO CODIGO JS
const canvas = document.getElementById("experience-canvas");
const sizes ={
    width: window.innerWidth,
    height: window.innerHeight,
};

const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias:true});
renderer.setSize(sizes.width, sizes.height );
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.ToneMappingExposure = 1.75; 
renderer.outputColorSpace = THREE.SRGBColorSpace;

//BACKGROUND COLOR
const gradientCanvas = document.createElement('canvas');
const ctx = gradientCanvas.getContext('2d');
gradientCanvas.width = 512;
gradientCanvas.height = 512;
const gradient = ctx.createLinearGradient(0, 0, 0, gradientCanvas.height);
gradient.addColorStop(0, '#FFE7BD'); 
gradient.addColorStop(0.3, '#FBFFED'); 
gradient.addColorStop(1, '#1c9feb'); 

ctx.fillStyle = gradient;
ctx.fillRect(0, 0, gradientCanvas.width, gradientCanvas.height);
const texture = new THREE.CanvasTexture(gradientCanvas); 
scene.background = texture;

//ARRAY DE OBJETOS
let currentLink=null;
let intersectObject = "";
const intersectObjects = [];
const intersectObjectsNames=["Hacienda_la_primavera", "Hacienda_casablanca","Hacienda_Salgado","HAcienda_San_Salvador", "Estancia_alonso","texto_cueca", "Scene",];

//TEXTO
const modalContent ={
    Hacienda_la_primavera:{title:"Descubre los relatos de La Primavera", link:"https://esta-tierra-bendita-2025.webflow.io/historia-la-primavera-de-paris"}, 
    Hacienda_casablanca:{title:"Descubre los relatos de la Estancia de los Baracaldo", link:"https://esta-tierra-bendita-2025.webflow.io/estancia-de-los-baracaldo"}, 
    Hacienda_Salgado:{title:"Descubre los relatos de la hacienda Salgado", link:"https://esta-tierra-bendita-2025.webflow.io/el-potrero-de-salgado"}, 
    HAcienda_San_Salvador:{title:"Descubre los relatos de la hacienda San Salvador", link:"https://esta-tierra-bendita-2025.webflow.io/hacienda-salgado"}, 
    Estancia_alonso:{title:"Descubre los relatos de la Estancia de los Alonso", link:"https://esta-tierra-bendita-2025.webflow.io/estancia-de-los-alonso"}, 
    Scene:{title:"Descubre los relatos del resguardo de Cueca", link:"https://esta-tierra-bendita-2025.webflow.io/menu-cueca"}
};
const modal = document.querySelector(".modal");
const modalTitle = document.querySelector(".modal-title");
const modalVisitButton = document.querySelector(".modal-visit-button");
const modalExitButton = document.querySelector(".modal-exit-button");

modalVisitButton.addEventListener("click", () => {
    if (currentLink) {
        console.log("Abriendo enlace:", currentLink);

        window.open(currentLink, "_blank");
    } else {
        console.log("No hay enlace asignado.");
    }
    hideModal(); 
});


function showModal(objectName) {
    const content = modalContent[objectName];
    if (content) {
        modalTitle.textContent = content.title;
        currentLink = content.link || null;

        console.log("Enlace asignado en showModal:", currentLink);
        modalVisitButton.textContent = `Explorar`;
        modalVisitButton.style.color = '#8B4513';
        modal.classList.remove("hidden"); // Muestra el modal
    }
}

function hideModal(){
    modal.classList.toggle("hidden");
}

//LLAMADO A MODELO DE BLENDER
const loader = new GLTFLoader();

loader.load('dist/terreno16abr.glb', 
    function (glb) {
        glb.scene.traverse((child)=> { // console.log("Objeto encontrado:", child.name);
            if(intersectObjectsNames.includes(child.name)){
                intersectObjects.push(child); //console.log("Objeto agregado:", child.name);
            }
            if(child.isMesh){
                child.castShadow = true;
                child.receiveShadow = true;
            }
            if(child.isMesh && intersectObjectsNames.includes(child.name))
                child.material = new THREE.MeshStandardMaterial({
                    color: child.material.color,
                    emissive: 0x758857,
                    emissiveIntensity: 1
            });       
        });
        const model = glb.scene;
        
        model.scale.set(0.1, 0.1, 0.1);
        model.position.set(10, -227, 0);
        scene.add( glb.scene);
    }, undefined, function (error) {
        console.error("NO cargo el modelo", error );
    }
);

// LUZ 
const sun = new THREE.DirectionalLight( 0xFFFFFF,3);
sun.castShadow = false;
sun.position.set(75,50,0);
//sun.target.position.set(75,0,0);
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom -100;
sun.shadow.normalBias = 0.1;
scene.add(sun);

const shadowHelper = new THREE.CameraHelper(sun.shadow.camera);
//scene.add( shadowHelper );
const helper = new THREE.DirectionalLightHelper(sun, 9);
//scene.add( helper ); //Los helper ayudan a visualizar los objetos que novan en el render
const light = new THREE.AmbientLight( 0xffffff, 3.2);
scene.add(light);

//CONTROL DE CAMARA
const camera = new THREE.PerspectiveCamera( 
    75, sizes.width / sizes.height, 0.1, 400 );
camera.position.set( 0, 20);
const defaultZoom = 60; 
camera.fov = defaultZoom;
camera.position.x = -60;camera.position.y = 1;camera.position.z = 129;


//Collison
let cameraBox = new THREE.Box3().setFromObject(camera);
const cameraColliderOffset = new THREE.Vector3(0, 0, 0);
const colliderSize = new THREE.Vector3(10, 20, 10); 

//MAP CONTROLS
const controls = new MapControls( camera, renderer.domElement);
controls.enableDamping = true;
controls.enableRotate = true;
controls.maxPolarAngle = Math.PI / 2;
controls.minPolarAngle = Math.PI / 2;

function onResize (){
    sizes.width= window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
       // composer.setSize(sizes.width, sizes.height);
    renderer.setSize(sizes.width, sizes.height );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
}

function checkCameraCollisions() {
    cameraBox.setFromObject(camera);
    cameraBox.translate(cameraColliderOffset);
    const intersects = [];
    scene.traverse((object) => {console.log("");
        if (object.name === "Tierra2" && object.isMesh) {
            const objectBox = new THREE.Box3().setFromObject(object);
            if (cameraBox.intersectsBox(objectBox)) {
                intersects.push(object);  
            }else{console.log("no golpeo esta joda");}
        }
    });
    if (intersects.length > 0) {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        let totalMoveBackDistance = 0;
        intersects.forEach(object => {
            const distance = camera.position.distanceTo(object.position);
            totalMoveBackDistance = Math.max(totalMoveBackDistance, distance - 0.1);  
        });
        if (totalMoveBackDistance > 0) {
            camera.position.add(direction.multiplyScalar(-totalMoveBackDistance));  // Mueve la cámara hacia atrás
        }
        cameraBox.setFromObject(camera);
    } 
}

function onPointerMove( event ) {
	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
/*/camara colisionador
    raycaster.setFromCamera( pointer, camera );
    const intersects = raycaster.intersectObjects( scene.children, false );
    if ( intersects.length > 0 ) {
        const object = intersects[0].object;
    }*/
}

function onClick(event) {
    console.log("click",intersectObject);
    if(intersectObject !==""){
        showModal(intersectObject);
    }
    
    /*
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(intersectObjects, true); // true para que busque recursivamente dentro de grupos

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        // Obtener nombre desde el padre o el mismo objeto si no hay padre
        const objectName = clickedObject.parent?.name || clickedObject.name;
        intersectObject = objectName;
        // Mostrar modal
        showModal(objectName);

        // Redireccionar si hay link
        if (objectLinks[objectName]) {
            window.open(objectLinks[objectName], "_blank");
        }

    } else {
        console.log("No hay objeto intersectado.");
        intersectObject = "";
    }*/
}

modalExitButton.addEventListener("click",hideModal);
window.addEventListener("resize", onResize);
window.addEventListener("click", onClick)
window.addEventListener("pointermove", onPointerMove);


function animate() {	
    console.log(camera.position.x);
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -75,40);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -300, 150);
    camera.lookAt(scene.position); // La cámara mirará al centro de la escena

    //checkCameraCollisions();
    raycaster.setFromCamera( pointer, camera );
 	const intersects = raycaster.intersectObjects(intersectObjects);
    //RAYCASTER DETECCION CLICK
    if(intersects.length > 0){
        document.body.style.cursor = "pointer";
        const intersectedObject = intersects[0].object;
        intersectObject = intersects[0].object.parent?.name || intersects[0].object.name; //console.log("Objeto intersectado:", intersectObject);

        if (intersectObject === "texto_cueca") {
            showModal(intersectObject);}
    } else{
        document.body.style.cursor = "default";
        intersectObject =""; 
    } 
	for ( let i = 0; i < intersects.length; i ++ ) {
		intersectObject = intersects[0].object.parent.name;
	}
    controls.update();
    
    //labelRenderer.render(scene,camera);
    //console.log(camera.rotation, camera.position);
    renderer.render( scene, camera );
}
renderer.setAnimationLoop(animate);