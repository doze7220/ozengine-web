/**
 * OZ Vector Editor が出力したスプライト（ESモジュール）。他のファイルに依存しない。
 * 既定のexportは、スプライトデータ（format・formatVersion・bounds・elements・source）と、
 * それを描く draw(ctx) を持つ1つのオブジェクト。座標の単位はpx、基準点は原点(0, 0)、y軸は下向き。
 */
const spriteData = {
  "format": "oz-vector-editor-sprite",
  "formatVersion": 1,
  "bounds": {
    "minX": -182.52809917355358,
    "minY": -223.36139116211177,
    "maxX": 179.80247933884303,
    "maxY": 232.19794983479474
  },
  "elements": [
    {
      "kind": "polyline",
      "id": "shape-5",
      "points": [
        {
          "x": 0.29008264462819233,
          "y": -222.36139116211177
        },
        {
          "x": 178.80247933884303,
          "y": 230.37179438671293
        },
        {
          "x": 0.29008264462819233,
          "y": 131.23314061689732
        },
        {
          "x": -181.52809917355358,
          "y": 231.19794983479474
        }
      ],
      "closed": true,
      "strokeColor": "#000000",
      "strokeWidth": 2
    },
    {
      "kind": "ellipse",
      "id": "shape-6",
      "x": -109.22493810228463,
      "y": 190.67283624184418,
      "radiusX": 28.555901624537,
      "radiusY": 29.21201071623841,
      "startAngle": 0,
      "endAngle": 6.283185307179586,
      "closed": true,
      "strokeColor": "#000000",
      "strokeWidth": 2
    },
    {
      "kind": "ellipse",
      "id": "shape-7",
      "x": 109.25274729603814,
      "y": 190.3233142368665,
      "radiusX": 28.555901624537,
      "radiusY": 29.21201071623841,
      "startAngle": 0,
      "endAngle": 6.283185307179586,
      "closed": true,
      "strokeColor": "#000000",
      "strokeWidth": 2
    }
  ],
  "source": {
    "format": "oz-vector-editor",
    "version": 1,
    "shapes": [
      {
        "type": "rect",
        "id": "shape-5",
        "points": [
          {
            "x": 0.29008264462819233,
            "y": -222.36139116211177
          },
          {
            "x": 178.80247933884303,
            "y": 230.37179438671293
          },
          {
            "x": 0.29008264462819233,
            "y": 131.23314061689732
          },
          {
            "x": -181.52809917355358,
            "y": 231.19794983479474
          }
        ],
        "strokeColor": "#000000",
        "strokeWidth": 2
      },
      {
        "type": "circle",
        "id": "shape-6",
        "points": [
          {
            "x": -109.22493810228463,
            "y": 190.67283624184418
          },
          {
            "x": -80.66903647774762,
            "y": 190.67283624184418
          },
          {
            "x": -109.22493810228463,
            "y": 161.46082552560577
          },
          {
            "x": -80.66903647774762,
            "y": 190.67283624184418
          },
          {
            "x": -80.66903647774762,
            "y": 190.67283624184418
          }
        ],
        "strokeColor": "#000000",
        "strokeWidth": 2
      },
      {
        "type": "circle",
        "id": "shape-7",
        "points": [
          {
            "x": 109.25274729603814,
            "y": 190.3233142368665
          },
          {
            "x": 137.80864892057514,
            "y": 190.3233142368665
          },
          {
            "x": 109.25274729603814,
            "y": 161.1113035206281
          },
          {
            "x": 137.80864892057514,
            "y": 190.3233142368665
          },
          {
            "x": 137.80864892057514,
            "y": 190.3233142368665
          }
        ],
        "strokeColor": "#000000",
        "strokeWidth": 2
      }
    ]
  }
};

const DEFAULT_STROKE_WIDTH = 2;

/**
 * スプライトを ctx へ描く。ctx の現在の変換の上に、原点(0, 0)を基準に描く。呼び出し前後で ctx の状態は変わらない。
 * @param {CanvasRenderingContext2D} ctx - 描画先の2Dコンテキスト
 */
function draw(ctx) {
    ctx.save();
    try {
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.miterLimit = 10;
        ctx.setLineDash([]);
        for (const element of spriteData.elements) {
            drawElement(ctx, element);
        }
    } finally {
        ctx.restore();
    }
}

/**
 * 描画要素1つの線を描く。strokeColor が文字列でない場合は線を描かない（線のパスと stroke() を呼ばない）。
 * 形の項目が足りない要素・未知の kind の要素も描かない。
 * @param {CanvasRenderingContext2D} ctx - 描画先の2Dコンテキスト
 * @param {Object} element - 描画要素
 */
function drawElement(ctx, element) {
    if (typeof element.strokeColor !== 'string') {
        return;
    }
    switch (element.kind) {
        case 'polyline': {
            const points = element.points;
            if (!Array.isArray(points) || points.length < 2) {
                return;
            }
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            if (element.closed === true) {
                ctx.closePath();
            }
            break;
        }
        case 'quadratic': {
            const points = element.points;
            if (!Array.isArray(points) || points.length < 3) {
                return;
            }
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.quadraticCurveTo(points[1].x, points[1].y, points[2].x, points[2].y);
            break;
        }
        case 'ellipse': {
            if (typeof element.radiusX !== 'number' || !(element.radiusX >= 0)
                || typeof element.radiusY !== 'number' || !(element.radiusY >= 0)) {
                return;
            }
            ctx.beginPath();
            ctx.ellipse(element.x, element.y, element.radiusX, element.radiusY, 0, element.startAngle, element.endAngle);
            if (element.closed === true) {
                ctx.closePath();
            }
            break;
        }
        default:
            return;
    }
    ctx.strokeStyle = element.strokeColor;
    ctx.lineWidth = typeof element.strokeWidth === 'number' && Number.isFinite(element.strokeWidth) && element.strokeWidth > 0
        ? element.strokeWidth
        : DEFAULT_STROKE_WIDTH;
    ctx.stroke();
}

export default { ...spriteData, draw };
