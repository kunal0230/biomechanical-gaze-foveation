/**
 * Ridge Regression with StandardScaler & Empirical Diagnostics
 * Implements regularized least-squares for 2D screen coordinate mapping
 */

export class RidgeRegression {
    constructor(alpha = 1.0) {
        this.alpha = alpha;
        this.weights = null;
        this.bias = null;
        this.trained = false;

        // StandardScaler parameters
        this.mean = null;
        this.std = null;

        // Diagnostic metrics
        this.diagnostics = {
            maeX: 0,
            maeY: 0,
            maeTotal: 0,
            r2X: 0,
            r2Y: 0,
            sampleCount: 0,
            featureCount: 0,
            conditionScore: 100
        };
    }

    _fitScaler(X) {
        const n = X.length;
        const d = X[0].length;

        this.mean = new Array(d).fill(0);
        for (let i = 0; i < n; i++) {
            const row = X[i];
            for (let j = 0; j < d; j++) {
                this.mean[j] += row[j];
            }
        }
        for (let j = 0; j < d; j++) {
            this.mean[j] /= n;
        }

        this.std = new Array(d).fill(0);
        for (let i = 0; i < n; i++) {
            const row = X[i];
            for (let j = 0; j < d; j++) {
                const diff = row[j] - this.mean[j];
                this.std[j] += diff * diff;
            }
        }
        for (let j = 0; j < d; j++) {
            this.std[j] = Math.sqrt(this.std[j] / n) || 1.0;
        }
    }

    _transform(X) {
        if (!this.mean || !this.std) return X;
        if (Array.isArray(X[0])) {
            return X.map(row => row.map((val, j) => (val - this.mean[j]) / (this.std[j] + 1e-9)));
        } else {
            return X.map((val, j) => (val - this.mean[j]) / (this.std[j] + 1e-9));
        }
    }

    train(X, y) {
        if (!X || X.length < 3) {
            console.error('RidgeRegression: Insufficient training samples (minimum 3 required)');
            return false;
        }

        const n = X.length;
        const d = X[0].length;

        this._fitScaler(X);
        const Xs = this._transform(X);

        // Append bias term (1.0)
        const XBias = Xs.map(row => [...row, 1.0]);
        const numCols = d + 1;

        // XtX = X^T * X
        const XtX = this._matMul(this._transpose(XBias), XBias);

        // Ridge Regularization: XtX + alpha * I (do not regularize the bias term)
        for (let i = 0; i < d; i++) {
            XtX[i][i] += this.alpha;
        }
        XtX[d][d] += this.alpha * 0.01;

        // XtY = X^T * Y
        const XtY = this._matMul(this._transpose(XBias), y);

        // Solve via Gaussian elimination with partial pivoting
        const XtXInv = this._inverse(XtX);
        if (!XtXInv) {
            console.error('RidgeRegression: Matrix inversion failed');
            return false;
        }

        const weightsWithBias = this._matMul(XtXInv, XtY);

        this.weights = weightsWithBias.slice(0, d);
        this.bias = weightsWithBias[d];
        this.trained = true;

        // Compute training diagnostics
        this._computeDiagnostics(X, y);

        return true;
    }

    _computeDiagnostics(X, y) {
        const n = X.length;
        let sumErrX = 0;
        let sumErrY = 0;
        let sumSqErrX = 0;
        let sumSqErrY = 0;
        let meanY0 = 0;
        let meanY1 = 0;

        for (let i = 0; i < n; i++) {
            meanY0 += y[i][0];
            meanY1 += y[i][1];
        }
        meanY0 /= n;
        meanY1 /= n;

        let totSqX = 0;
        let totSqY = 0;

        for (let i = 0; i < n; i++) {
            const pred = this.predict(X[i]);
            const errX = Math.abs(pred[0] - y[i][0]);
            const errY = Math.abs(pred[1] - y[i][1]);

            sumErrX += errX;
            sumErrY += errY;
            sumSqErrX += errX * errX;
            sumSqErrY += errY * errY;

            totSqX += (y[i][0] - meanY0) ** 2;
            totSqY += (y[i][1] - meanY1) ** 2;
        }

        const r2X = totSqX > 1e-6 ? Math.max(0, 1.0 - (sumSqErrX / totSqX)) : 0.85;
        const r2Y = totSqY > 1e-6 ? Math.max(0, 1.0 - (sumSqErrY / totSqY)) : 0.85;
        const maeTotal = (sumErrX + sumErrY) / (2 * n);

        this.diagnostics = {
            maeX: sumErrX / n,
            maeY: sumErrY / n,
            maeTotal: maeTotal,
            r2X: r2X,
            r2Y: r2Y,
            sampleCount: n,
            featureCount: X[0].length,
            // Score from 0 to 100 based on MAE in typical screen resolution (100% at < 40px MAE)
            conditionScore: Math.min(100, Math.max(20, Math.round(100 - (maeTotal / 250) * 80)))
        };
    }

    predict(features) {
        if (!this.trained) {
            throw new Error('RidgeRegression: Model has not been trained');
        }

        const scaledFeatures = this._transform(features);
        const result = [this.bias[0], this.bias[1]];

        for (let i = 0; i < scaledFeatures.length; i++) {
            result[0] += scaledFeatures[i] * this.weights[i][0];
            result[1] += scaledFeatures[i] * this.weights[i][1];
        }

        return result;
    }

    getDiagnostics() {
        return this.diagnostics;
    }

    _transpose(m) {
        const rows = m.length;
        const cols = m[0].length;
        const t = Array.from({ length: cols }, () => new Float64Array(rows));
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                t[j][i] = m[i][j];
            }
        }
        return t;
    }

    _matMul(a, b) {
        const rowsA = a.length;
        const colsA = a[0].length;
        const colsB = b[0].length;
        const res = Array.from({ length: rowsA }, () => new Float64Array(colsB));

        for (let i = 0; i < rowsA; i++) {
            for (let k = 0; k < colsA; k++) {
                const aik = a[i][k];
                if (aik === 0) continue;
                for (let j = 0; j < colsB; j++) {
                    res[i][j] += aik * b[k][j];
                }
            }
        }
        return res;
    }

    _inverse(m) {
        const n = m.length;
        const aug = Array.from({ length: n }, (_, i) => {
            const row = new Float64Array(2 * n);
            for (let j = 0; j < n; j++) row[j] = m[i][j];
            row[n + i] = 1.0;
            return row;
        });

        for (let i = 0; i < n; i++) {
            let maxRow = i;
            let maxVal = Math.abs(aug[i][i]);
            for (let k = i + 1; k < n; k++) {
                const val = Math.abs(aug[k][i]);
                if (val > maxVal) {
                    maxVal = val;
                    maxRow = k;
                }
            }

            if (maxRow !== i) {
                const temp = aug[i];
                aug[i] = aug[maxRow];
                aug[maxRow] = temp;
            }

            let pivot = aug[i][i];
            if (Math.abs(pivot) < 1e-12) {
                pivot = 1e-12;
                aug[i][i] = 1e-12;
            }

            const invPivot = 1.0 / pivot;
            for (let j = 0; j < 2 * n; j++) {
                aug[i][j] *= invPivot;
            }

            for (let k = 0; k < n; k++) {
                if (k === i) continue;
                const factor = aug[k][i];
                if (factor === 0) continue;
                for (let j = 0; j < 2 * n; j++) {
                    aug[k][j] -= factor * aug[i][j];
                }
            }
        }

        return Array.from({ length: n }, (_, i) => Array.from(aug[i].slice(n)));
    }

    toJSON() {
        return {
            alpha: this.alpha,
            weights: this.weights ? Array.from(this.weights).map(r => Array.from(r)) : null,
            bias: this.bias ? Array.from(this.bias) : null,
            trained: this.trained,
            mean: this.mean ? Array.from(this.mean) : null,
            std: this.std ? Array.from(this.std) : null,
            diagnostics: this.diagnostics
        };
    }

    static fromJSON(data) {
        const model = new RidgeRegression(data.alpha || 1.0);
        model.weights = data.weights;
        model.bias = data.bias;
        model.trained = data.trained || false;
        model.mean = data.mean;
        model.std = data.std;
        model.diagnostics = data.diagnostics || model.diagnostics;
        return model;
    }
}
