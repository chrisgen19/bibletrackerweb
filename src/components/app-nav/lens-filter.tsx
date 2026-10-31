/*
 * A displacement map for a rounded lens: red ramps left to right, green top to bottom, and
 * a blurred neutral grey core leaves the middle undistorted, so only the rim bends light.
 */
const MAP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" preserveAspectRatio="none">
<defs>
<linearGradient id="r"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#f00"/></linearGradient>
<linearGradient id="g" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#0f0"/></linearGradient>
<filter id="b"><feGaussianBlur stdDeviation="7"/></filter>
</defs>
<rect width="100" height="60" fill="url(#r)"/>
<rect width="100" height="60" fill="url(#g)" style="mix-blend-mode:screen"/>
<rect x="16" y="14" width="68" height="32" rx="16" fill="#808000" filter="url(#b)"/>
</svg>`;

const MAP_URI = `data:image/svg+xml,${encodeURIComponent(MAP_SVG)}`;

/** The `#lens-refract` filter the lens uses as a backdrop-filter (Chromium only). */
export function LensFilter() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <filter
        id="lens-refract"
        x="0"
        y="0"
        width="100%"
        height="100%"
        colorInterpolationFilters="sRGB"
      >
        <feImage
          href={MAP_URI}
          x="0"
          y="0"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          result="map"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="map"
          scale="22"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}
