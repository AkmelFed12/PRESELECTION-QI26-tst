const images = [
  "11d8f257-e6e8-4b71-89bf-2ba9adebab02 (1).jpeg",
  "11d8f257-e6e8-4b71-89bf-2ba9adebab02.jpeg",
  "19e7b0d1-1e0f-4abe-a8e1-c1672dc2b165 (1).jpeg",
  "19e7b0d1-1e0f-4abe-a8e1-c1672dc2b165.jpeg",
  "1e3c9864-bdaf-45a2-9d10-6c661aca1565 (1).jpeg",
  "1e3c9864-bdaf-45a2-9d10-6c661aca1565.jpeg",
  "1eb10afc-1a75-488c-b5de-9bfcdf60151c (1).jpeg",
  "1eb10afc-1a75-488c-b5de-9bfcdf60151c.jpeg",
  "264aca1d-7c54-49d1-b84c-ed434a12a875 (1).jpeg",
  "264aca1d-7c54-49d1-b84c-ed434a12a875.jpeg",
  "270fa372-584d-4c67-9ecf-a202222c7dc0.jpeg",
  "2c5bb578-3363-42be-90b7-17f6c1cd8681.jpeg",
  "2cbe713a-9886-480c-a4dd-3420c66c1cf8.jpeg",
  "2e914979-ddbf-4027-9a2d-e78c3a63e486.jpeg",
  "2ee878ae-bb63-4a08-944c-ff20ccd37627.jpeg",
  "35890a4b-c4fa-43af-82f2-32ead7fc57a1.jpeg",
  "35890a4b-c4fa-43af-82f2-32ead7fc57a1(1).jpeg",
  "3aaa5879-1f70-44b9-b15a-24624d7a86fe.jpeg",
  "3ae18521-000c-4bd4-bb4f-9e929bca2160.jpeg",
  "3b9bbe4e-b6f7-4b31-af4f-08095e91b136.jpeg",
  "44de9a6a-4229-46ac-9702-95276e43c389.jpeg",
  "4f711065-ad26-4b59-b4a1-3f48f104cecf.jpeg",
  "5e625337-8ed4-424e-a7a0-8ebb24c27478.jpeg",
  "5f8b8890-4a97-4a24-85aa-46edb38805b0.jpeg",
  "6c607e6a-bf4f-4431-b7bd-77a430f7651e.jpeg",
  "7fb0d232-5ce1-405f-ae49-d4b05fffb6b0.jpeg",
  "81ab7ff6-f64e-4cdf-bde0-f28e3e301270.jpeg",
  "81c8f7d8-ef3f-4733-a910-67a9ccf6d5f0.jpeg",
  "88ca175a-866c-496b-83ec-c567741e7144.jpeg",
  "8aff017e-31ae-4b1c-a5c2-59d40274cd16.jpeg",
  "968e22dc-f6ca-44c1-a0a4-6fbc0cc1afaa.jpeg",
  "9f489c44-f02e-4165-b853-f8ab989eab39.jpeg",
  "a3a85942-a4c9-4823-bb76-a87aed6fa927.jpeg",
  "ad6df698-367e-4b8f-a46a-1bd2e915cd2d.jpeg",
  "c2df301e-545c-4be0-938b-62600dbb5d29.jpeg",
  "c5c8a457-2390-4b50-af96-8a77989640cb.jpeg",
  "cba4c353-4162-42cf-a9db-11c32c1dd8d2.jpeg",
  "daee7c1a-d2ee-453f-bde6-d926d7ac20aa.jpeg",
  "e1b4bf98-7053-44fd-854e-ad88f1ef0683.jpeg",
  "e8af564f-8765-49a8-b757-157c29cbb98d.jpeg",
  "e9a14f06-abc0-4286-bf40-c1a7abf7708c.jpeg",
  "FB_IMG_1725885341306.jpg",
  "FB_IMG_1725885346893.jpg",
  "FB_IMG_1725885348985.jpg",
  "FB_IMG_1725885351030.jpg",
  "FB_IMG_1725885353048.jpg",
  "FB_IMG_1725885355010.jpg",
  "FB_IMG_1725885356900.jpg",
  "FB_IMG_1725885358970.jpg",
  "FB_IMG_1725885360892.jpg",
  "FB_IMG_1725885363054.jpg",
  "FB_IMG_1725885365124.jpg",
  "FB_IMG_1725885366911.jpg",
  "FB_IMG_1725885368621.jpg",
  "FB_IMG_1725885370223.jpg",
  "FB_IMG_1725885372370.jpg",
  "FB_IMG_1725885373996.jpg",
  "FB_IMG_1725885375684.jpg",
  "FB_IMG_1725885377535.jpg",
  "FB_IMG_1725885385989.jpg",
  "FB_IMG_1725885388219.jpg",
  "FB_IMG_1725885390441.jpg",
  "FB_IMG_1725885392460.jpg",
  "FB_IMG_1725885396298.jpg",
  "FB_IMG_1725885401276.jpg",
  "FB_IMG_1725885424025.jpg",
  "FB_IMG_1725885433215.jpg",
  "FB_IMG_1725885439112.jpg",
  "FB_IMG_1725885441288.jpg",
  "FB_IMG_1725885443193.jpg",
  "FB_IMG_1725885447147.jpg",
  "FB_IMG_1725885449678.jpg",
  "FB_IMG_1725885452311.jpg",
  "FB_IMG_1725885454172.jpg",
  "FB_IMG_1725885456204.jpg",
  "FB_IMG_1725885460703.jpg",
  "FB_IMG_1725885471816.jpg",
  "FB_IMG_1725885474483.jpg",
  "FB_IMG_1725885476614.jpg",
  "FB_IMG_1725885479045.jpg",
  "FB_IMG_1725885481208.jpg",
  "FB_IMG_1725885483372.jpg",
  "FB_IMG_1725885485837.jpg",
  "FB_IMG_1725885487883.jpg",
  "FB_IMG_1725885490063.jpg",
  "FB_IMG_1725885492026.jpg",
  "FB_IMG_1725885494290.jpg",
  "FB_IMG_1725885498448.jpg",
  "FB_IMG_1725885502324.jpg",
  "FB_IMG_1725885504655.jpg",
  "FB_IMG_1725885507243.jpg",
  "FB_IMG_1725885509618.jpg",
  "FB_IMG_1725885511554.jpg",
  "FB_IMG_1725885513678.jpg",
  "FB_IMG_1725885515720.jpg",
  "FB_IMG_1725885517641.jpg",
  "FB_IMG_1725885519587.jpg",
  "FB_IMG_1725885521249.jpg",
  "FB_IMG_1725885523008.jpg",
  "FB_IMG_1725885524753.jpg",
  "FB_IMG_1725885526658.jpg",
  "FB_IMG_1725885528705.jpg",
  "FB_IMG_1725885530706.jpg",
  "FB_IMG_1725885533467.jpg",
  "FB_IMG_1725885535453.jpg",
  "FB_IMG_1725885537481.jpg",
  "FB_IMG_1725885539427.jpg",
  "FB_IMG_1725885541331.jpg",
  "FB_IMG_1725885543117.jpg",
  "FB_IMG_1725885547555.jpg",
  "FB_IMG_1725885549986.jpg",
  "FB_IMG_1725885554699.jpg",
  "FB_IMG_1725885557786.jpg",
  "FB_IMG_1725885560586.jpg",
  "FB_IMG_1725885563840.jpg",
  "FB_IMG_1725885575082.jpg",
  "FB_IMG_1725885580215.jpg",
  "FB_IMG_1725885584721.jpg",
  "FB_IMG_1725885592444.jpg",
  "FB_IMG_1725885594521.jpg",
  "FB_IMG_1725885597088.jpg",
  "FB_IMG_1725885601733.jpg",
  "FB_IMG_1725885603996.jpg",
  "FB_IMG_1725885607218.jpg",
  "FB_IMG_1725885612365.jpg",
  "FB_IMG_1725885629282.jpg",
  "FB_IMG_1725885632272.jpg",
  "FB_IMG_1725885638511.jpg",
  "FB_IMG_1725885641329.jpg",
  "FB_IMG_1725885643660.jpg",
  "FB_IMG_1725885646226.jpg",
  "FB_IMG_1725885648574.jpg",
  "FB_IMG_1725885651409.jpg",
  "FB_IMG_1725885659376.jpg",
  "FB_IMG_1725885662276.jpg",
  "FB_IMG_1725885664457.jpg",
  "FB_IMG_1725885666755.jpg",
  "FB_IMG_1725885668782.jpg",
  "FB_IMG_1725885674554.jpg",
  "FB_IMG_1725885676885.jpg",
  "FB_IMG_1725885680323.jpg",
  "FB_IMG_1725885683928.jpg",
  "FB_IMG_1725885726947.jpg",
  "FB_IMG_1725885791566.jpg",
  "FB_IMG_1725885795357.jpg",
  "FB_IMG_1725885798023.jpg",
  "FB_IMG_1725885800186.jpg",
  "FB_IMG_1725885802551.jpg",
  "FB_IMG_1725885804614.jpg",
  "FB_IMG_1725885808053.jpg",
  "FB_IMG_1725885810736.jpg",
  "FB_IMG_1725885813872.jpg",
  "FB_IMG_1725885816406.jpg",
  "FB_IMG_1725885857127.jpg",
  "FB_IMG_1725885861014.jpg",
  "FB_IMG_1725885863642.jpg",
  "FB_IMG_1725885866312.jpg",
  "FB_IMG_1725885870604.jpg",
  "FB_IMG_1725885885402.jpg",
  "FB_IMG_1725885887811.jpg",
  "FB_IMG_1725885890234.jpg",
  "FB_IMG_1725885894424.jpg",
  "FB_IMG_1725885899172.jpg",
  "FB_IMG_1725885910123.jpg",
  "FB_IMG_1725885912412.jpg",
  "FB_IMG_1725885915125.jpg",
  "FB_IMG_1725885917638.jpg",
  "FB_IMG_1725885920884.jpg",
  "FB_IMG_1725885923305.jpg",
  "FB_IMG_1725885931304.jpg",
  "FB_IMG_1725885934006.jpg",
  "FB_IMG_1725885936488.jpg",
  "FB_IMG_1725885938650.jpg",
  "FB_IMG_1725885940763.jpg",
  "FB_IMG_1725885942843.jpg",
  "FB_IMG_1725885944626.jpg",
  "FB_IMG_1725885946668.jpg",
  "FB_IMG_1725885959114.jpg",
  "FB_IMG_1725885962330.jpg",
  "FB_IMG_1725885966994.jpg",
  "FB_IMG_1725885969409.jpg",
  "FB_IMG_1725885971588.jpg",
  "FB_IMG_1725885974021.jpg",
  "FB_IMG_1725885976503.jpg",
  "FB_IMG_1725885978783.jpg",
  "FB_IMG_1725885981064.jpg",
  "FB_IMG_1725885983849.jpg",
  "FB_IMG_1725885986179.jpg",
  "FB_IMG_1725885989886.jpg",
  "FB_IMG_1725885993224.jpg",
  "FB_IMG_1725885995924.jpg",
  "FB_IMG_1725885998094.jpg",
  "FB_IMG_1725886000522.jpg",
  "FB_IMG_1725886003614.jpg",
  "FB_IMG_1725886006274.jpg",
  "FB_IMG_1725886011352.jpg",
  "FB_IMG_1725886014109.jpg",
  "FB_IMG_1725886016400.jpg",
  "FB_IMG_1725886018900.jpg",
  "FB_IMG_1725886021351.jpg",
  "FB_IMG_1725886025116.jpg",
  "FB_IMG_1725886027538.jpg",
  "FB_IMG_1725886029986.jpg",
  "FB_IMG_1725886032584.jpg",
  "FB_IMG_1725886035133.jpg",
  "FB_IMG_1725886037363.jpg",
  "FB_IMG_1725886042848.jpg",
  "FB_IMG_1725886046035.jpg",
  "FB_IMG_1725886048388.jpg",
  "FB_IMG_1725886059253.jpg",
  "FB_IMG_1725886064669.jpg",
  "FB_IMG_1725886069080.jpg",
  "FB_IMG_1725886072099.jpg",
  "FB_IMG_1725886078322.jpg",
  "FB_IMG_1725886082027.jpg",
  "FB_IMG_1725886084157.jpg",
  "FB_IMG_1725886086589.jpg",
  "FB_IMG_1725886089844.jpg",
  "FB_IMG_1725886094319.jpg",
  "FB_IMG_1725886096853.jpg",
  "FB_IMG_1725886099286.jpg",
  "FB_IMG_1725886101515.jpg",
  "FB_IMG_1725886103504.jpg",
  "FB_IMG_1725886105658.jpg",
  "FB_IMG_1725886107572.jpg",
  "FB_IMG_1725886110438.jpg",
  "FB_IMG_1725886113305.jpg",
  "FB_IMG_1725886115435.jpg",
  "FB_IMG_1725886117850.jpg",
  "FB_IMG_1725886119695.jpg",
  "FB_IMG_1725886121473.jpg",
  "FB_IMG_1725886123351.jpg",
  "FB_IMG_1725886125197.jpg",
  "FB_IMG_1725886130798.jpg",
  "FB_IMG_1725886133482.jpg",
  "FB_IMG_1725886139922.jpg",
  "FB_IMG_1725886143661.jpg",
  "FB_IMG_1725886150172.jpg",
  "FB_IMG_1725886159393.jpg",
  "FB_IMG_1725886317076.jpg",
  "FB_IMG_1725886318701.jpg",
  "FB_IMG_1725886320363.jpg",
  "FB_IMG_1725886322762.jpg",
  "FB_IMG_1725886325480.jpg",
  "FB_IMG_1725886330980.jpg",
  "FB_IMG_1725886333210.jpg",
  "FB_IMG_1725886335894.jpg",
  "FB_IMG_1725886341011.jpg",
  "FB_IMG_1725886343052.jpg",
  "FB_IMG_1725886345330.jpg",
  "FB_IMG_1725886351087.jpg",
  "FB_IMG_1725886353250.jpg",
  "FB_IMG_1725886355464.jpg",
  "FB_IMG_1725886357594.jpg",
  "FB_IMG_1725886360218.jpg",
  "FB_IMG_1725886362708.jpg",
  "FB_IMG_1725886365242.jpg",
  "FB_IMG_1725886367085.jpg",
  "FB_IMG_1725886368781.jpg",
  "FB_IMG_1725886370459.jpg",
  "FB_IMG_1725886371952.jpg",
  "FB_IMG_1725886373628.jpg",
  "FB_IMG_1725886375709.jpg",
  "FB_IMG_1725886378174.jpg",
  "FB_IMG_1725886381327.jpg",
  "FB_IMG_1725886383457.jpg",
  "FB_IMG_1725886385620.jpg",
  "FB_IMG_1725886388069.jpg",
  "FB_IMG_1725886390587.jpg",
  "FB_IMG_1725886393908.jpg",
  "FB_IMG_1725886396153.jpg",
  "FB_IMG_1725886398517.jpg",
  "FB_IMG_1725886401134.jpg",
  "FB_IMG_1725886403515.jpg",
  "FB_IMG_1725886407238.jpg",
  "FB_IMG_1725886409504.jpg",
  "FB_IMG_1725886415422.jpg",
  "FB_IMG_1725886420707.jpg",
  "FB_IMG_1725886422937.jpg",
  "FB_IMG_1725886426677.jpg",
  "FB_IMG_1725886430065.jpg",
  "FB_IMG_1725886434794.jpg",
  "FB_IMG_1725886439892.jpg",
  "FB_IMG_1725886442576.jpg",
  "FB_IMG_1725886444689.jpg",
  "FB_IMG_1725886446617.jpg",
  "FB_IMG_1725886448882.jpg",
  "FB_IMG_1725886451027.jpg",
  "FB_IMG_1725886454416.jpg",
  "FB_IMG_1725886456629.jpg",
  "FB_IMG_1725886458843.jpg",
  "FB_IMG_1725886461880.jpg",
  "FB_IMG_1725886466853.jpg",
  "FB_IMG_1725886470131.jpg",
  "FB_IMG_1725886475984.jpg",
  "FB_IMG_1725886479774.jpg",
  "FB_IMG_1725886482038.jpg",
  "FB_IMG_1725886483766.jpg",
  "FB_IMG_1725886487975.jpg",
  "FB_IMG_1725886490306.jpg",
  "FB_IMG_1725886492419.jpg",
  "FB_IMG_1725886494332.jpg",
  "FB_IMG_1725886498374.jpg",
  "FB_IMG_1725886501042.jpg",
  "FB_IMG_1725886503287.jpg",
  "FB_IMG_1725886505772.jpg",
  "FB_IMG_1725886509493.jpg",
  "FB_IMG_1725886513250.jpg",
  "FB_IMG_1725886517443.jpg",
  "FB_IMG_1725886520612.jpg",
  "FB_IMG_1725886523162.jpg",
  "FB_IMG_1725886525929.jpg",
  "FB_IMG_1725886528176.jpg",
  "FB_IMG_1725886530257.jpg",
  "FB_IMG_1725886532268.jpg",
  "FB_IMG_1725886534046.jpg",
  "FB_IMG_1725886535975.jpg",
  "FB_IMG_1725886537786.jpg",
  "FB_IMG_1725886540620.jpg",
  "FB_IMG_1725886544293.jpg",
  "FB_IMG_1725886546238.jpg",
  "FB_IMG_1725886548134.jpg",
  "FB_IMG_1725886549680.jpg",
  "FB_IMG_1725886551203.jpg",
  "FB_IMG_1725886553551.jpg",
  "FB_IMG_1725886555211.jpg",
  "fd17a503-dc92-4a5e-98c4-b4f7bfb643b4.jpeg",
  "IMG_0813.jpeg",
  "IMG_0815.jpeg",
  "IMG_0816.jpeg",
  "IMG_0817.jpeg",
  "IMG_0818.jpeg",
  "IMG_0819.jpeg",
  "IMG_0820.jpeg",
  "IMG_0821.jpeg",
  "IMG_0822.jpeg",
  "IMG_0823.jpeg",
  "IMG_0824.jpeg",
  "IMG_0825.jpeg",
  "IMG_0826.jpeg",
  "IMG_0827.jpeg",
  "IMG_0828.jpeg",
  "IMG_0829.jpeg",
  "IMG_0830.jpeg",
  "IMG_0831.jpeg",
  "IMG_0832.jpeg",
  "IMG_0833.jpeg",
  "IMG_0834.jpeg",
  "IMG_0835.jpeg",
  "IMG_0836.jpeg",
  "IMG_0841.jpeg",
  "IMG_0842.jpeg",
  "IMG_0846.jpeg",
  "IMG_0847.jpeg",
  "IMG_0853.jpeg",
  "IMG_0854.jpeg",
  "IMG_0855.jpeg",
  "IMG_0856.jpeg",
  "IMG_0857.jpeg",
  "IMG_0858.jpeg",
  "IMG_0859.jpeg",
  "IMG_0860.jpeg",
  "IMG_0861.jpeg",
  "IMG_0862.jpeg",
  "IMG_0863.jpeg",
  "IMG_0864.jpeg",
  "IMG_0865.jpeg",
  "IMG_0868.jpeg",
  "IMG_0869.jpeg",
  "IMG_0870.jpeg",
  "IMG_0871.jpeg",
  "IMG_0872.jpeg",
  "IMG_0873.jpeg",
  "IMG_0874.jpeg",
  "IMG_0875.jpeg",
  "IMG_0876.jpeg",
  "IMG_0877.jpeg",
  "IMG_0878.jpeg",
  "IMG_0879.jpeg",
  "IMG_0880.jpeg",
  "IMG_0881.jpeg",
  "IMG_0882.jpeg"
];

const status = document.getElementById('galleryStatus');
const sliderWrap = document.getElementById('sliderWrap');
const slideImage = document.getElementById('slideImage');
const slideCounter = document.getElementById('slideCounter');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const downloadBtn = document.getElementById('downloadBtn');
const togglePlay = document.getElementById('togglePlay');
const thumbs = document.getElementById('thumbs');
const speedSelect = document.getElementById('speedSelect');
const gridGallery = document.getElementById('gridGallery');

const basePath = '/api/gallery/2024';

let index = 0;
let timer = null;
let isPlaying = true;
let intervalMs = 5000;

function showSlide(i) {
  if (!images.length) return;
  index = (i + images.length) % images.length;
  const src = `${basePath}/${encodeURIComponent(images[index])}`;
  slideImage.src = src;
  downloadBtn.href = src;
  downloadBtn.setAttribute('download', images[index]);
  slideCounter.textContent = `${index + 1} / ${images.length}`;
  if (thumbs) {
    const active = thumbs.querySelector('.thumb.active');
    if (active) active.classList.remove('active');
    const current = thumbs.querySelector(`[data-idx="${index}"]`);
    if (current) current.classList.add('active');
  }
}

if (!images.length) {
  status.textContent = 'Aucune photo disponible.';
} else {
  status.style.display = 'none';
  sliderWrap.style.display = 'block';
  showSlide(0);
}

function restartTimer() {
  if (timer) clearInterval(timer);
  if (!isPlaying) return;
  timer = setInterval(() => showSlide(index + 1), intervalMs);
}

prevBtn?.addEventListener('click', () => {
  showSlide(index - 1);
  restartTimer();
});
nextBtn?.addEventListener('click', () => {
  showSlide(index + 1);
  restartTimer();
});

if (images.length) {
  restartTimer();
}

togglePlay?.addEventListener('click', () => {
  isPlaying = !isPlaying;
  togglePlay.textContent = isPlaying ? 'Pause' : 'Lecture';
  restartTimer();
});

if (thumbs) {
  thumbs.innerHTML = images
    .map(
      (name, idx) =>
        `<img class="thumb${idx === 0 ? ' active' : ''}" data-idx="${idx}" src="${basePath}/${encodeURIComponent(name)}" alt="thumb" style="width:70px;height:50px;object-fit:cover;border-radius:6px;border:2px solid transparent;cursor:pointer;" />`,
    )
    .join('');
  thumbs.addEventListener('click', (e) => {
    const img = e.target.closest('img[data-idx]');
    if (!img) return;
    const idx = Number(img.dataset.idx);
    showSlide(idx);
    restartTimer();
  });
}

speedSelect?.addEventListener('change', () => {
  intervalMs = Number(speedSelect.value || 5000);
  restartTimer();
});

if (gridGallery) {
  gridGallery.innerHTML = images
    .map(
      (name, idx) =>
        `<img class="grid-thumb" data-idx="${idx}" src="${basePath}/${encodeURIComponent(name)}" alt="photo" />`,
    )
    .join('');
  gridGallery.addEventListener('click', (e) => {
    const img = e.target.closest('img[data-idx]');
    if (!img) return;
    const idx = Number(img.dataset.idx);
    showSlide(idx);
    sliderWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    restartTimer();
  });
}
