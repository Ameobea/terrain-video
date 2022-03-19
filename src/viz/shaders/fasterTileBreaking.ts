/**
 * Taken from: https://www.shadertoy.com/view/Xtl3zf
 * The MIT License
 * Copyright © 2017 Inigo Quilez
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
export const fasterTileBreaking = `
float sum( vec3 v ) { return v.x+v.y+v.z; }

vec3 textureNoTile(sampler2D samp, sampler2D noiseSampler, in vec2 rawX, float v, float scale ) {
    vec2 x = rawX * scale;
    float k = texture( noiseSampler, 0.005 * x).x; // cheap (cache friendly) lookup
    // return vec3(k,k,k);

    vec2 duvdx = dFdx( rawX );
    vec2 duvdy = dFdx( rawX );

    float l = k*8.0;
    float f = fract(l);

#if 0
    float ia = floor(l); // my method
    float ib = ia + 1.0;
#else
    float ia = floor(l+0.5); // suslik's method (see comments)
    float ib = floor(l);
    f = min(f, 1.0-f)*2.0;
#endif

    vec2 offa = sin(vec2(3.0,7.0)*ia); // can replace with any other hash
    vec2 offb = sin(vec2(3.0,7.0)*ib); // can replace with any other hash

    vec3 cola = textureGrad( samp, x + v*offa, duvdx, duvdy ).xyz;
    vec3 colb = textureGrad( samp, x + v*offb, duvdx, duvdy ).xyz;

    return mix( cola, colb, smoothstep(0.2,0.8,f-0.1*sum(cola-colb)) );
}`;
