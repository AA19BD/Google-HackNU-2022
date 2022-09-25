import ThreeJSOverlayView from "@ubilabs/threejs-overlay-view";
import { CatmullRomCurve3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { getMapsApiOptions, loadMapsApi } from "../jsm/load-maps-api";
import * as THREE from "three";
import CAR_MODEL_URL from "url:../assets/lowpoly-sedan.glb";
import DOT_MODEL_URL from "url:../assets/dot.glb";
import { data } from "./data.js";

const CAR_FRONT = new Vector3(0, 1, 0);
const select = document.querySelector("#select");
let dev;
select.addEventListener("change", function (e) {
  dev = e.target.value;
  let MODEL_URL = null;
  if (data[dev][0]["Activity"] == "driving") {
    MODEL_URL = CAR_MODEL_URL;
  } else {
    MODEL_URL = DOT_MODEL_URL;
  }

  const VIEW_PARAMS = {
    center: {
      lat: data[dev][0].Latitude,
      lng: data[dev][0].Longitude,
      alt: data[dev][0].Altitude,
    },
    zoom: 18,
    heading: 40,
    tilt: 65,
  };

  const ANIMATION_DURATION = 12000;
  let ANIMATION_POINTS = [];

  const mapContainer = document.querySelector("#map");
  const tmpVec3 = new Vector3();

  function addData(DEV) {
    ANIMATION_POINTS = data[DEV].map((t) => ({
      lat: t["Latitude"],
      lng: t["Longitude"],
      alt: t["Altitude"],
    }));
    console.log(ANIMATION_POINTS);
  }

  async function main() {
    const map = await initMap();
    const overlay = new ThreeJSOverlayView(VIEW_PARAMS.center);
    const scene = overlay.getScene();

    overlay.setMap(map);
    addData(dev);

    const points = [];

    for (let i = 0; i < ANIMATION_POINTS.length; i++) {
      let lat = ANIMATION_POINTS[i].lat;
      let lng = ANIMATION_POINTS[i].lng;
      let altitude = ANIMATION_POINTS[i].alt;
      let v = overlay.latLngAltToVector3({ lat, lng, altitude: altitude });

      points.push(v);
    }

    const curve = new CatmullRomCurve3(points, true, "catmullrom", 0.2);
    curve.updateArcLengths();

    const trackLine = createTrackLine(curve);
    scene.add(trackLine);

    let carModel = null;
    let cylModel = null;

    loadCarModel().then((obj) => {
      carModel = obj;
      overlay.scene.add(carModel);
      overlay.requestRedraw();
    });

    loadCylynder().then((obj) => {
      cylModel = obj;
      overlay.scene.add(cylModel);
      overlay.requestRedraw();
    });

    overlay.update = () => {
      trackLine.material.resolution.copy(overlay.getViewportSize());

      if (!carModel) return;

      const animationProgress =
        (performance.now() % ANIMATION_DURATION) / ANIMATION_DURATION;

      curve.getPointAt(animationProgress, z.position);
      curve.getTangentAt(animationProgress, tmpVec3);
      carModel.quaternion.setFromUnitVectors(CAR_FRONT, tmpVec3);

      curve.getPointAt(animationProgress, cylModel.position);
      curve.getTangentAt(animationProgress, tmpVec3);
      carModel.quaternion.setFromUnitVectors(CAR_FRONT, tmpVec3);

      overlay.requestRedraw();
    };
  }

  async function initMap() {
    const { mapId } = getMapsApiOptions();
    await loadMapsApi();

    return new google.maps.Map(mapContainer, {
      mapId,
      disableDefaultUI: true,
      backgroundColor: "transparent",
      gestureHandling: "greedy",
      ...VIEW_PARAMS,
    });
  }

  function createTrackLine(curve) {
    const numPoints = 10 * curve.points.length;
    const curvePoints = curve.getSpacedPoints(numPoints);
    const positions = new Float32Array(numPoints * 3);

    for (let i = 0; i < numPoints; i++) {
      curvePoints[i].toArray(positions, 3 * i);
    }

    const trackLine = new Line2(
      new LineGeometry(),
      new LineMaterial({
        color: 0x0fff58,
        linewidth: 13,
      })
    );

    trackLine.geometry.setPositions(positions);

    return trackLine;
  }

  async function loadCarModel() {
    const loader = new GLTFLoader();

    return new Promise((resolve) => {
      loader.load(MODEL_URL, (gltf) => {
        const group = gltf.scene;
        const carModel = group.getObjectByName("sedan");

        carModel.scale.setScalar(1000);
        carModel.rotation.set(Math.PI / 2, 0, Math.PI, "ZXY");

        resolve(group);
      });
    });
  }

  async function loadCylynder() {
    const cyl = objectGenerator();

    return new Promise((resolve) => {
      const group = new THREE.Group();
      group.add(cyl);
      resolve(group);
    });
  }

  function objectGenerator() {
    const cylynder = new THREE.CylinderGeometry(3, 3, 10, 32);
    const cylMaterial = new THREE.MeshBasicMaterial({
      color: 0x006dfc,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const dot = new THREE.IcosahedronGeometry(0.5, 3);
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: 0x006dfc,
    });
    const innerMesh = new THREE.Mesh(dot, dotMaterial);
    const outerMesh = new THREE.Mesh(cylynder, cylMaterial);
    outerMesh.rotateX(-Math.PI * 0.5);
    outerMesh.center;
    return outerMesh;
  }
  let spans = document.querySelectorAll("span");
  for (let i = 0; i < data[dev].length; i++) {
    setTimeout(() => {
      console.log(data[dev][i]);
      spans[0].innerText = data[dev][i]["Latitude"];
      spans[1].innerText = data[dev][i]["Longitude"];
      spans[2].innerText = data[dev][i]["Altitude"];
      spans[3].innerText = data[dev][i]["Activity"];
      spans[4].innerText = data[dev][i]["Accuracy"];
    }, 1000 * i);
  }
  main().catch((err) => console.error(err));
});
