const t=String.raw;
export const notation={
'linear-notation':[t`n,d,p=d+1`,t`x_i,y_i`,t`a,b`,t`\overline x,\overline y`,t`X_0\in\mathbb R^{n\times d}`,t`X=[\mathbf1\ X_0]\in\mathbb R^{n\times p}`,t`\beta=(b,w_1,\ldots,w_d)^T`,t`y,\widehat y\in\mathbb R^n`,t`e=y-\widehat y,\ r=-e`,t`\varepsilon`,t`\mathbb E,\operatorname{Var},\operatorname{Cov}`,t`U,Y`,t`\|v\|_2^2=\sum_jv_j^2`,t`A^T,I,\operatorname{tr}(A)`],
'knn-notation':[t`D=\{(x_i,y_i)\}_{i=1}^n`,t`z\in\mathbb R^d`,t`\rho(x,z)`,t`N_k(z)`,t`k`,t`\mathbf1[A]`,t`c`],
'knn-worked-distance':[t`z=(6,70)`,t`A=(5,50)`,t`B=(8,72)`,t`\mu_j`,t`s_j`,t`x'_j=\frac{x_j-\mu_j}{s_j}`],
'knn-generalization':[t`n`,t`k_n`,t`d`,t`r`,t`k_n/n`],
'knn-shift':[t`P(X)`,t`P(Y\mid X)`,null,null,null],
'logistic-notation':[t`x_i\in\mathbb R^d`,t`y_i\in\{0,1\}`,t`w\in\mathbb R^d,b\in\mathbb R`,t`z_i=w^Tx_i+b`,t`\sigma(z)=\frac1{1+e^{-z}}`,t`p_i=\sigma(z_i)`,t`1-p_i`],
'logistic-likelihood-derivation':[t`\operatorname{Bernoulli}(p_i)`,t`L(w,b)`,t`\ell_i`,t`J(w,b)`,t`\log`],
'logistic-gradient-derivation':[t`\ell`,t`z`,t`p=\sigma(z)`,t`\sigma'(z)=p(1-p)`,t`x_j`],
'logistic-metrics-deep':[t`TP`,t`FP`,t`TN`,t`FN`,null,null],
'logistic-ranking-metrics':[t`t`,t`TPR=\frac{TP}{TP+FN}`,t`FPR=\frac{FP}{FP+TN}`,null,null,null,null],
'logistic-softmax':[t`K`,t`w_k,b_k`,t`z_{ik}=w_k^Tx_i+b_k`,t`p_{ik}`,t`y_i\in\{1,\ldots,K\}`,t`\mathbf1[y_i=k]`],
'logistic-categorical':[t`c`,t`M`,t`e_c\in\{0,1\}^M`,t`N_c`,t`S_c`,t`\alpha>0`,t`\mu`],
 'tree-notation':[t`S`,t`|S|`,t`j`,t`t`,t`s=(j,t)`,t`S_L`,t`S_R`,t`p_k`,t`I(S)`,t`\Delta I(s)`],
 'tree-worked-split':[t`\operatorname{Gini}(S)=1-\sum_kp_k^2`,t`p_0,p_1`,t`I_{\mathrm{after}}`,t`\Delta I`],
 'tree-categorical':[t`C=\{c_1,\ldots,c_M\}`,t`A\subset C`,t`2^{M-1}-1`,t`\mu_c`,t`x_j\in A`],
 'tree-probability':[t`n_{\mathrm{leaf}}`,t`n_c`,t`K`,t`\alpha>0`,t`\widetilde p_c`],
 'svm-notation':[t`x_i\in\mathbb R^d`,t`y_i\in\{-1,+1\}`,t`f(x)=w^Tx+b`,t`w`,t`b`,t`y_if(x_i)`,t`\|w\|_2`,t`\gamma_i=\frac{y_if(x_i)}{\|w\|_2}`,t`C>0`],
 'svm-margin-derivation':[t`x^+`,t`x^-`,null,t`\xi_i\ge0`],
 'svm-dual-notation':[t`\alpha_i\ge0`,t`SV=\{i:\alpha_i>0\}`,t`\langle x_i,x_j\rangle=x_i^Tx_j`,t`K(x,z)`,t`\phi(x)`],
 'svm-multiclass':[t`K`,t`f_k(x)`,t`\arg\max_k`,null,null],
 'svm-generalization':[t`R`,t`B`,t`n`,t`\gamma`,t`O(g(n))`,null],
 'svm-calibration':[t`f(x)`,t`A,B`,t`\widehat p(Y=1\mid x)`,null]
};
for(const kind of ['knn','tree','svm'])notation[kind+'-causality']=[t`T\in\{0,1\}`,t`Y(1),Y(0)`,t`Z`,t`\tau`,t`\perp`,t`\operatorname{do}(X=x)`];
