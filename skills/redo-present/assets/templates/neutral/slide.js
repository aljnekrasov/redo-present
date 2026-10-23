(() => {
  const slide = document.querySelector(".slide");
  function resize() {
    const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
    slide.style.transform = `scale(${scale})`;
    slide.style.marginLeft = `${Math.max(0, (innerWidth - 1920 * scale) / 2)}px`;
    slide.style.marginTop = `${Math.max(0, (innerHeight - 1080 * scale) / 2)}px`;
  }
  addEventListener("resize", resize);
  resize();
})();
