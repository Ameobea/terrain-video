/**
 * Taken from: https://www.shadertoy.com/view/4tsGzf
 */
export const voronoiTileBreaking = `
vec4 hash4( vec2 p ) { return fract(sin(vec4( 1.0+dot(p,vec2(37.0,17.0)),
  2.0+dot(p,vec2(11.0,47.0)),
  3.0+dot(p,vec2(41.0,29.0)),
  4.0+dot(p,vec2(23.0,31.0))))*103.0); }

vec3 textureNoTile( sampler2D samp, in vec2 uvRaw, float v) {
  // BYPASS
  // return texture(samp, uv).xyz;

  vec2 uv = mod(uvRaw, 4.);

  vec2 p = floor( uv );
  vec2 f = fract( uv );

  // derivatives (for correct mipmapping)
  vec2 ddx = dFdx( uv );
  vec2 ddy = dFdy( uv );

  vec3 va = vec3(0.0);
  float w1 = 0.0;
  float w2 = 0.0;
  for( int j=-1; j<=1; j++ )
    for( int i=-1; i<=1; i++ ) {
      vec2 g = vec2( float(i),float(j) );
      vec4 o = hash4( p + g );
      vec2 r = g - f + o.xy;
      float d = dot(r,r);
      float w = exp(-5.0*d );
      vec3 c = textureGrad( samp, uv + v*o.zw, ddx, ddy ).xyz;
      va += w*c;
      w1 += w;
      w2 += w*w;
    }

  // normal averaging --> lowers contrasts
  return va/w1;

  // contrast preserving average
  float mean = 0.3;// textureGrad( samp, uv, ddx*16.0, ddy*16.0 ).x;
  vec3 res = mean + (va-w1*mean)/sqrt(w2);
  return mix( va/w1, res, v );
}`;
