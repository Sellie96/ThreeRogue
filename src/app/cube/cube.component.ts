import { Component, ElementRef, Input, ViewChild, input } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

@Component({
  selector: 'app-cube',
  standalone: true,
  imports: [],
  templateUrl: './cube.component.html',
  styleUrl: './cube.component.scss',
})
export class CubeComponent {
  @ViewChild('canvas')
  private canvasRef!: ElementRef;

  @Input() public texture: string = '../../texture.jpg';

  @Input() public cameraZ: number = 200;

  @Input() public cameraY: number = 0;

  @Input() public fieldOfView: number = 5;

  @Input('nearClipping') public nearClippingPlane: number = 1;

  @Input('farClipping') public farClippingPlane: number = 1000;

  private camera!: THREE.PerspectiveCamera;

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }

  private renderer!: THREE.WebGLRenderer;

  private scene!: THREE.Scene;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isHovered = false;
  private overlayObject: any;

  private gltfModel!: THREE.Object3D;

  private loadModel() {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        '../../assets/floor_foundation_allsides.gltf.glb',
        (gltf) => {
          this.gltfModel = gltf.scene;
          this.gltfModel.rotation.x = Math.PI / 2;
          console.log(this.gltfModel);
          resolve(gltf.scene);
        },
        undefined,
        (error) => {
          console.error(error);
          reject(error);
        }
      );
    });
  }

  createModelInstance() {
    const modelInstance = this.gltfModel.clone();
    return modelInstance;
  }

  private createScene() {
    this.scene = new THREE.Scene();
    let mat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    let geo = new THREE.BufferGeometry();
    const plane = new THREE.Mesh(geo, mat);
    this.scene.add(plane);
    var group = new THREE.Group();
    group.name = 'Group';

    this.loadModel().then(() => {
      var group = new THREE.Group();
      group.name = 'Group';

      var spacing = 1.6;
      var startX = -4.5 * spacing;
      var startY = -4.5 * spacing;

      for (var i = 0; i < 20; i++) {
        for (var j = 0; j < 20; j++) {
          var modelInstance = this.createModelInstance();
          modelInstance.position.x = startX + i * spacing;
          modelInstance.position.y = startY + j * spacing;
          group.add(modelInstance);
        }
      }

      this.scene.add(group);
    });
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(ambientLight);
    this.scene.add(directionalLight);

    let aspectRatio = this.getAspectRatio();
    this.camera = new THREE.PerspectiveCamera(
      this.fieldOfView,
      aspectRatio,
      this.nearClippingPlane,
      this.farClippingPlane
    );

    this.camera.position.set(0, -360, 125);
    this.camera.fov = 45;
    this.camera.lookAt(this.scene.position);
  }

  private getAspectRatio() {
    return this.canvas.clientWidth / this.canvas.clientHeight;
  }

  private startRenderingLoop() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

    let component: CubeComponent = this;
    (function render() {
      requestAnimationFrame(render);
      component.renderer.render(component.scene, component.camera);
    })();

    this.renderer.domElement.addEventListener(
      'mousemove',
      this.onMouseMove.bind(this),
      false
    );
  }

  private onMouseMove(event: MouseEvent): void {
    event.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(
      this.scene.getObjectByName('Group')!.children,
      true
    );
  
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const object = intersect.object as THREE.Mesh;
      if (!object.geometry.boundingBox) {
        object.geometry.computeBoundingBox();
      }
  
      const boundingBox = object.geometry.boundingBox!.clone();
      boundingBox.applyMatrix4(object.matrixWorld);
      this.overlayObject.position.copy(boundingBox.max);
      this.overlayObject.position.y -= 1.1;
      this.overlayObject.position.x -= 1.1;

      this.overlayObject.position.z += 0.01;
      const size = boundingBox.getSize(new THREE.Vector3());
      this.overlayObject.scale.set(size.x, size.y, size.z);
  
      this.scene.add(this.overlayObject);
  
      this.isHovered = true;
    } else {
      if (this.scene.children.includes(this.overlayObject)) {
        this.scene.remove(this.overlayObject);
      }
      this.isHovered = false;
    }
  }

  constructor() {
    const overlayGeometry = new THREE.PlaneGeometry(1, 1);
    const overlayMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });
    this.overlayObject = new THREE.Mesh(overlayGeometry, overlayMaterial);
  }

  ngOnInit(): void {}

  ngAfterViewInit() {
    this.createScene();
    this.startRenderingLoop();
  }
}
