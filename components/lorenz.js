const ReglComponent = require('idyll-regl-component');
const mat4 = require('gl-mat4');
const hsv2rgb = require('hsv2rgb');
const Camera = require('regl-camera');

const NUM_POINTS = 10000;

class Lorenz extends ReglComponent {
  initialize(r, node) {
    const width = node.getBoundingClientRect().width;
    const height = Math.max(width / 2, 600);
    node.style.height = height + 'px';
    const regl = r(node);
    const { a, b, c, h } = this.props
    let x = 0;
    let y = 10;
    let z = 10;

    const avg = [0, 0, 0];
    const pointBuffer = regl.buffer(Array(NUM_POINTS).fill().map(function () {
      x+=h*a*(y-x),               // and pass new coords
      y+=h*(x*(b-z)-y),           // calculate new values
      z+=h*(x*y-c*z)
      avg[0] += x;
      avg[1] += y;
      avg[2] += z;
      return [x, y, z];
    }))

    avg[0] /= NUM_POINTS;
    avg[1] /= NUM_POINTS;
    avg[2] /= NUM_POINTS;

    const camera = Camera(regl, {
      center: avg,
      distance: 75,
      theta: Math.PI / 2,
      mouse: false
    })

    const indexBuffer = regl.buffer(Array(NUM_POINTS).fill().map(function (d, i) {
      return i;
    }));

    const freqBuffer = regl.buffer(Array(NUM_POINTS).fill().map(function () {
      return [
        // freq
        Math.random() * 10,
        Math.random() * 10,
        Math.random() * 10,
        Math.random() * 10
      ]
    }))

    const drawParticles = regl({
      vert: `
      precision mediump float;
      attribute vec3 position;
      attribute vec4 freq;
      attribute float index;
      uniform mat4 view, projection;
      uniform float time;
      varying vec4 fragColor;
      void main() {
        gl_PointSize = 5.0;
        gl_Position = projection * view * vec4(cos(freq.xyz * time) / 4.0 + position, 1);
        fragColor = vec4(vec3(sqrt(position.x * position.x + position.y + position.y + position.z + position.z) / 30.0), 1.0);
      }`,

      frag: `
      precision lowp float;
      varying vec4 fragColor;
      void main() {
        if (length(gl_PointCoord.xy - 0.5) > 0.5) {
          discard;
        }
        gl_FragColor = fragColor;
      }`,

      attributes: {
        position: pointBuffer,
        freq: freqBuffer,
        index: indexBuffer
      },

      uniforms: {
        time: ({tick}) => tick * 0.005
      },

      count: NUM_POINTS,

      primitive: 'points'
    })

    this.pointBuffer = pointBuffer;
    this.camera = camera;
    this.regl = regl;

    regl.frame(({tick}) => {
      regl.clear({
        depth: 1,
        color: [1, 1, 1, 1]
      })
      this.camera(() => {
        drawParticles();
      })
    })

  }

  update(newProps) {
    const { a, b, c, h } = newProps;
    const { oa, ob, oc, oh } = this.props;
    if (a !== oa || b !== ob || c !== oc || h !== oh) {
      let x = 0;
      let y = 10;
      let z = 10;

      this.pointBuffer({
        data: Array(NUM_POINTS).fill().map(function () {
          x+=h*a*(y-x),               // and pass new coords
          y+=h*(x*(b-z)-y),           // calculate new values
          z+=h*(x*y-c*z)
          return [x, y, z];
        })
      })
    }
    if (newProps.focused !== this.props.focused) {
      this.camera = Camera(this.regl, Object.assign({}, this.camera, {
        mouse: newProps.focused
      }));
    }
  }
}

Lorenz.defaultProps = {
  a: 10,
  b: 28,
  c: 8/3,
  h: 0.008,
  focused: false
};

module.exports = Lorenz;

