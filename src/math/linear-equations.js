// Display equations have an explicit TeX equivalent, not a heuristic Unicode
// conversion. The build fails when a website section gains an unmapped equation.
const t = String.raw;
export const equationSelector = '.equation-card > div, .derivation-step code, .formula, .proof-stack code, .metric-formula-grid b, #linear-noise-laws tbody td:nth-child(2), #linear-noise-laws tbody td:nth-child(3)';
export const equations = {
  'linear-model': [t`\widehat y_i=b+\sum_{j=1}^{d}w_jx_{ij},\qquad \widehat y=X\beta`],
  'linear-objective': [t`J(\beta)=\frac1n\lVert X\beta-y\rVert_2^2=\frac1n\sum_i(\widehat y_i-y_i)^2`],
  'linear-scalar-proof': [
    t`\frac{\partial J}{\partial b}=\frac2n\sum_i(ax_i+b-y_i)=0`,
    t`a\sum_i x_i+nb-\sum_i y_i=0\quad\Longrightarrow\quad\widehat b=\overline y-\widehat a\,\overline x`,
    t`\frac{\partial J}{\partial a}=\frac2n\sum_i x_i(ax_i+b-y_i)=0`,
    t`\widehat a\sum_i x_i(x_i-\overline x)=\sum_i x_i(y_i-\overline y)`,
    t`\begin{aligned}\sum_i x_i(x_i-\overline x)&=\sum_i(x_i-\overline x)^2,\\\sum_i x_i(y_i-\overline y)&=\sum_i(x_i-\overline x)(y_i-\overline y)\end{aligned}`,
    t`S_{xx}=\sum_i(x_i-\overline x)^2,\qquad S_{xy}=\sum_i(x_i-\overline x)(y_i-\overline y)`,
    t`\boxed{\widehat a=\frac{S_{xy}}{S_{xx}},\qquad\widehat b=\overline y-\widehat a\,\overline x}`,
    t`\nabla^2J=\frac2n\begin{pmatrix}\sum_i x_i^2&\sum_i x_i\\\sum_i x_i&n\end{pmatrix}`,
    t`(u,v)\nabla^2J(u,v)^\top=\frac2n\sum_i(ux_i+v)^2`,
    t`\det(\nabla^2J)=\frac4{n^2}\left[n\sum_i x_i^2-\left(\sum_i x_i\right)^2\right]=\frac{4S_{xx}}n>0`
  ],
  'linear-covariance': [
    t`\begin{gathered}\operatorname{Cov}_n(x,y)=\frac{S_{xy}}n,\quad\operatorname{Var}_n(x)=\frac{S_{xx}}n,\\\widehat a=\frac{\operatorname{Cov}_n(x,y)}{\operatorname{Var}_n(x)}=\rho_n\frac{s_y}{s_x}\end{gathered}`,
    t`R(a,b)=\mathbb E[(Y-aU-b)^2],\quad\mathbb E[U^2],\mathbb E[Y^2]<\infty,\quad\operatorname{Var}(U)>0`,
    t`\begin{gathered}\frac{\partial R}{\partial b}=2(a\mathbb E[U]+b-\mathbb E[Y])=0,\\b^*=\mathbb E[Y]-a^*\mathbb E[U]\end{gathered}`,
    t`R(a,b^*(a))=\operatorname{Var}(Y)-2a\operatorname{Cov}(U,Y)+a^2\operatorname{Var}(U)`,
    t`\begin{gathered}\frac{\partial R}{\partial a}=-2\operatorname{Cov}(U,Y)+2a\operatorname{Var}(U)=0,\\a^*=\frac{\operatorname{Cov}(U,Y)}{\operatorname{Var}(U)}\end{gathered}`,
    t`Y=a_0U+b_0+\varepsilon\quad\Longrightarrow\quad a^*=a_0+\frac{\operatorname{Cov}(U,\varepsilon)}{\operatorname{Var}(U)}`
  ],
  'linear-worked-example': [t`\begin{gathered}\overline x=2.5,\quad\overline y=3.5,\quad S_{xx}=5,\quad S_{xy}=4,\\\widehat a=0.8,\quad\widehat b=1.5,\quad\mathrm{SSE}=1.8,\quad\mathrm{MSE}=0.45\end{gathered}`],
  'linear-analytic': [
    t`r=X\beta-y,\qquad J=\frac{r^\top r}n,\qquad dr=X\,d\beta`,
    t`dJ=\frac{(dr)^\top r+r^\top dr}n=\frac2n r^\top dr`,
    t`dJ=\frac2n r^\top X\,d\beta=\left[\frac2n X^\top r\right]^\top d\beta`,
    t`\nabla J(\beta)=\frac2nX^\top(X\beta-y),\qquad\nabla^2J=\frac2nX^\top X`,
    t`\nabla J=0\quad\Longleftrightarrow\quad X^\top X\widehat\beta=X^\top y`,
    t`\operatorname{rank}(X)=p\quad\Longrightarrow\quad\boxed{\widehat\beta=(X^\top X)^{-1}X^\top y}`,
    t`h^\top\nabla^2Jh=\frac2n\lVert Xh\rVert^2>0\qquad(h\ne0)`,
    t`X^\top X\in\mathbb R^{p\times p},\qquad X^\top y\in\mathbb R^{p\times1},\qquad\widehat\beta\in\mathbb R^{p\times1}`
  ],
  'linear-rank': [
    t`X=U_r\Sigma_rV_r^\top,\quad\operatorname{rank}(X)=r,\quad\Sigma_r=\operatorname{diag}(s_1,\ldots,s_r),\ s_j>0`,
    t`\lVert y-X\beta\rVert^2=\lVert U_r^\top y-\Sigma_rV_r^\top\beta\rVert^2+\lVert(I-U_rU_r^\top)y\rVert^2`,
    t`\Sigma_rV_r^\top\beta=U_r^\top y\quad\Longrightarrow\quad V_r^\top\beta=\Sigma_r^{-1}U_r^\top y`,
    t`X^+=V_r\Sigma_r^{-1}U_r^\top,\qquad\widehat\beta_0=X^+y`,
    t`\widehat\beta=X^+y+h,\qquad h\in\ker(X)`,
    t`\widehat y=XX^+y=U_rU_r^\top y`,
    t`\lVert\widehat\beta_0+h\rVert^2=\lVert\widehat\beta_0\rVert^2+\lVert h\rVert^2`
  ],
  'linear-projection': [
    t`P=XX^+=U_rU_r^\top,\qquad P^\top=P,\qquad P^2=P`,
    t`\widehat y=Py,\qquad e=(I-P)y,\qquad X^\top e=0`,
    t`y-X\beta=e+(\widehat y-X\beta)`,
    t`\lVert y-X\beta\rVert^2=\lVert e\rVert^2+\lVert\widehat y-X\beta\rVert^2\ge\lVert e\rVert^2`,
    t`\begin{gathered}S_{yy}=\lVert y-\overline y\mathbf1\rVert^2=\lVert\widehat y-\overline y\mathbf1\rVert^2+\mathrm{SSE},\\ R^2=1-\frac{\mathrm{SSE}}{S_{yy}}\in[0,1]\end{gathered}`
  ],
  'linear-gradient-derivation': [
    t`r_i=b+\sum_jw_jx_{ij}-y_i,\qquad J=\frac1n\sum_i r_i^2`,
    t`\frac{\partial r_i}{\partial w_j}=x_{ij},\qquad\frac{\partial r_i}{\partial b}=1`,
    t`\frac{\partial(r_i^2)}{\partial w_j}=2r_ix_{ij}`,
    t`\frac{\partial J}{\partial w_j}=\frac2n\sum_i r_ix_{ij}`,
    t`\frac{\partial J}{\partial b}=\frac2n\sum_i r_i`,
    t`w_j\leftarrow w_j-\eta\frac{\partial J}{\partial w_j},\qquad b\leftarrow b-\eta\frac{\partial J}{\partial b}`
  ],
  'gradient-direction-proof': [
    t`J(\beta+hv)=J(\beta)+h\langle\nabla J(\beta),v\rangle+o(h),\qquad\lVert v\rVert_2=1`,
    t`\langle\nabla J,v\rangle\ge-\lVert\nabla J\rVert_2\lVert v\rVert_2=-\lVert\nabla J\rVert_2`,
    t`v^*=-\frac{\nabla J}{\lVert\nabla J\rVert_2}\qquad(\nabla J\ne0)`
  ],
  'linear-gradient': [
    t`\nabla J(\beta_t)=H(\beta_t-\widehat\beta),\qquad q_{t+1}=(I-\eta H)q_t`,
    t`H=V\operatorname{diag}(\mu_j)V^\top,\qquad c_t=V^\top q_t`,
    t`c_{t+1,j}=(1-\eta\mu_j)c_{t,j}`,
    t`\lvert1-\eta\mu_j\rvert<1\ \ (\forall j)\quad\Longleftrightarrow\quad0<\eta<\frac2{\mu_p}`,
    t`\lVert q_t\rVert_2\le\rho^t\lVert q_0\rVert_2,\qquad\rho=\max_j\lvert1-\eta\mu_j\rvert<1`,
    t`J(\beta-\eta g)=J(\beta)-\eta\lVert g\rVert^2+\frac{\eta^2}2g^\top Hg,\qquad g=\nabla J(\beta)`
  ],
  'gradient-variants': [t`g_t=\frac1m\sum_{i\in B_t}\nabla\ell_i(\beta_t),\qquad\beta_{t+1}=\beta_t-\eta_tg_t`],
  'linear-probability': [
    t`Y-g(U)=\varepsilon+m(U)-g(U)`,
    t`\begin{aligned}\mathbb E[(Y-g(U))^2\mid U]&=\mathbb E[\varepsilon^2\mid U]+(m(U)-g(U))^2\\&\quad+2(m(U)-g(U))\mathbb E[\varepsilon\mid U]\end{aligned}`,
    t`\mathbb E[(Y-g(U))^2\mid U]=\operatorname{Var}(Y\mid U)+(m(U)-g(U))^2`,
    t`\operatorname*{arg\,min}_g\mathbb E[(Y-g(U))^2]=m(U)\quad\text{почти наверное}`
  ],
  'linear-loss-derivation': [
    t`p(y\mid X,\beta,\sigma^2)=(2\pi\sigma^2)^{-n/2}\exp\!\left(-\frac{\lVert y-X\beta\rVert^2}{2\sigma^2}\right)`,
    t`-\log p=\frac n2\log(2\pi\sigma^2)+\frac{\mathrm{SSE}(\beta)}{2\sigma^2}`,
    t`\operatorname*{arg\,min}_{\beta}(-\log p)=\operatorname*{arg\,min}_{\beta}\mathrm{SSE}(\beta)=\widehat\beta_{\mathrm{OLS}}`,
    t`\frac{\partial(-\log p)}{\partial v}=\frac n{2v}-\frac{\mathrm{SSE}}{2v^2}=0,\qquad v=\sigma^2`,
    t`\widehat\sigma^2_{\mathrm{MLE}}=\frac{\mathrm{SSE}(\widehat\beta)}n`
  ],
  'linear-estimator': [
    t`\widehat\beta=Ay=AX\beta_0+A\varepsilon=\beta_0+A\varepsilon`,
    t`\mathbb E[\widehat\beta\mid X]=\beta_0+A\mathbb E[\varepsilon\mid X]=\beta_0`,
    t`\operatorname{Cov}(\widehat\beta\mid X)=A\Omega A^\top`,
    t`\Omega=\sigma^2I\quad\Longrightarrow\quad\operatorname{Cov}(\widehat\beta\mid X)=\sigma^2(X^\top X)^{-1}`,
    t`\begin{aligned}\operatorname{Var}(\widehat a\mid x)&=\frac{\sigma^2}{S_{xx}},\\\operatorname{Var}(\widehat b\mid x)&=\sigma^2\left(\frac1n+\frac{\overline x^2}{S_{xx}}\right),\\\operatorname{Cov}(\widehat a,\widehat b\mid x)&=-\frac{\sigma^2\overline x}{S_{xx}}\end{aligned}`
  ],
  'linear-noise-laws': [
    t`q(e)\propto\exp\!\left(-\frac{e^2}{2\sigma^2}\right)`,t`\frac{e^2}{2\sigma^2}`,
    t`q(e)=\frac{\exp(-|e|/c)}{2c}`,t`\frac{|e|}c`,
    t`q(e)\propto\left(1+\frac{e^2}{\nu s^2}\right)^{-(\nu+1)/2}`,t`\frac{\nu+1}2\log\!\left(1+\frac{e^2}{\nu s^2}\right)`,
    t`q(e)=\frac1{\pi c[1+(e/c)^2]}`,t`\log\!\left(1+(e/c)^2\right)`,
    t`q(e)=\begin{cases}\frac1{2c},&|e|\le c,\\0,&|e|>c\end{cases}`,t`\begin{cases}\mathrm{const},&|e|\le c,\\+\infty,&|e|>c\end{cases}`
  ],
  'linear-gauss-markov': [
    t`\widetilde\beta=Cy,\qquad\mathbb E[\widetilde\beta\mid X]=CX\beta_0`,
    t`\mathbb E[\widetilde\beta\mid X]=\beta_0\ \ (\forall\beta_0)\quad\Longleftrightarrow\quad CX=I`,
    t`C=A+D,\qquad A=(X^\top X)^{-1}X^\top\quad\Longrightarrow\quad DX=0`,
    t`AD^\top=(X^\top X)^{-1}X^\top D^\top=(X^\top X)^{-1}(DX)^\top=0`,
    t`\operatorname{Cov}(\widetilde\beta\mid X)-\operatorname{Cov}(\widehat\beta\mid X)=\sigma^2DD^\top`,
    t`v^\top[\operatorname{Cov}(\widetilde\beta\mid X)-\operatorname{Cov}(\widehat\beta\mid X)]v=\sigma^2\lVert D^\top v\rVert^2\ge0`
  ],
  'linear-inference': [
    t`\mathrm{SSE}=e^\top e=\varepsilon^\top M\varepsilon`,
    t`\mathbb E[\varepsilon^\top M\varepsilon\mid X]=\sum_i\sum_jM_{ij}\mathbb E[\varepsilon_i\varepsilon_j\mid X]=\sigma^2\operatorname{tr}(M)`,
    t`\operatorname{tr}(M)=n-p\quad\Longrightarrow\quad\mathbb E[\mathrm{SSE}\mid X]=(n-p)\sigma^2`,
    t`s^2=\frac{\mathrm{SSE}}{n-p}\quad\Longrightarrow\quad\mathbb E[s^2\mid X]=\sigma^2`,
    t`\operatorname{Cov}(A\varepsilon,M\varepsilon\mid X)=\sigma^2AM=0`,
    t`Z_j=\frac{\widehat\beta_j-\beta_{0,j}}{\sigma\sqrt{[(X^\top X)^{-1}]_{jj}}}\sim\mathcal N(0,1)`,
    t`T_j=\frac{Z_j}{\sqrt{(\mathrm{SSE}/\sigma^2)/(n-p)}}\sim t_{n-p}`,
    t`\widehat\beta_j\ \pm\ t_{1-\alpha/2,n-p}\,s\sqrt{[(X^\top X)^{-1}]_{jj}}`
  ],
  'linear-prediction': [
    t`\begin{gathered}\operatorname{Var}(\widehat\mu_0-\mu_0\mid X,x_0)=\sigma^2h_0,\quad h_0=x_0^\top(X^\top X)^{-1}x_0,\\\operatorname{Var}(Y_0-\widehat\mu_0\mid X,x_0)=\sigma^2(1+h_0)\end{gathered}`,
    t`\begin{aligned}\text{Среднее:}\quad&\widehat\mu_0\pm t_{1-\alpha/2,n-p}\,s\sqrt{h_0},\\\text{Новый ответ:}\quad&\widehat\mu_0\pm t_{1-\alpha/2,n-p}\,s\sqrt{1+h_0}\end{aligned}`
  ],
  'linear-heteroskedasticity': [
    t`Q(\beta)=(y-X\beta)^\top\Omega^{-1}(y-X\beta)`,
    t`dQ=-2(y-X\beta)^\top\Omega^{-1}X\,d\beta`,
    t`\widehat\beta_{\mathrm{GLS}}=(X^\top\Omega^{-1}X)^{-1}X^\top\Omega^{-1}y`,
    t`X^*=\Omega^{-1/2}X,\quad y^*=\Omega^{-1/2}y,\quad\operatorname{Cov}(\varepsilon^*\mid X)=I`,
    t`\operatorname{Cov}(\widehat\beta_{\mathrm{GLS}}\mid X)=(X^\top\Omega^{-1}X)^{-1}`,
    t`\widehat V_{\mathrm{HC0}}=(X^\top X)^{-1}X^\top\operatorname{diag}(e_i^2)X(X^\top X)^{-1}`
  ],
  'linear-consistency': [
    t`\widehat\beta-\beta_0=(X^\top X/n)^{-1}(X^\top\varepsilon/n)`,
    t`X^\top X/n\xrightarrow{P}Q\succ0,\qquad X^\top\varepsilon/n\xrightarrow{P}0`,
    t`\widehat\beta\xrightarrow{P}\beta_0`,
    t`\begin{gathered}Y=a_0U+\gamma Z+b_0+\varepsilon,\quad\operatorname{Cov}(U,\varepsilon)=0,\\\text{без признака }Z:\quad a^*=a_0+\gamma\frac{\operatorname{Cov}(U,Z)}{\operatorname{Var}(U)}\end{gathered}`
  ],
  'linear-regularization': [
    t`J_\lambda(\beta)=\frac1n\lVert X\beta-y\rVert^2+\lambda\beta^\top D\beta,\qquad\lambda\ge0`,
    t`\nabla J_\lambda=\frac2nX^\top(X\beta-y)+2\lambda D\beta`,
    t`(X^\top X+n\lambda D)\widehat\beta_\lambda=X^\top y`,
    t`\widehat\beta_\lambda=(X^\top X+n\lambda D)^{-1}X^\top y\qquad(\lambda>0)`
  ],
  'linear-regularization-deep': [
    t`\begin{aligned}\mathbb E[\widehat w_\lambda\mid X]-w_0&=-k(A+kI)^{-1}w_0,\\\operatorname{Cov}(\widehat w_\lambda\mid X)&=\sigma^2(A+kI)^{-1}A(A+kI)^{-1}\end{aligned}`,
    t`\begin{gathered}d_j>0:\quad\operatorname{bias}_j=-\frac{k\theta_j}{d_j+k},\quad\operatorname{variance}_j=\frac{\sigma^2d_j}{(d_j+k)^2},\\\mathrm{MSE}_j=\frac{k^2\theta_j^2+\sigma^2d_j}{(d_j+k)^2}\end{gathered}`
  ],
  'linear-lasso-geometry': [
    t`\min_w\left[J(w)+\lambda\sum_j|w_j|\right]`,
    t`\partial|w_j|=\{\operatorname{sign}(w_j)\}\ (w_j\ne0),\qquad\partial|0|=[-1,1]`,
    t`0\in\partial_jJ+\lambda\partial|w_j|`,
    t`w_j=0\text{ допустим в оптимуме}\quad\Longleftrightarrow\quad|\partial_jJ|\le\lambda`,
    t`w_j>0:\quad2(w_j-c_j)+\lambda=0\quad\Longrightarrow\quad w_j=c_j-\lambda/2`,
    t`w_j<0:\quad2(w_j-c_j)-\lambda=0\quad\Longrightarrow\quad w_j=c_j+\lambda/2`,
    t`w_j=0:\quad0\in-2c_j+\lambda[-1,1]\quad\Longleftrightarrow\quad|c_j|\le\lambda/2`
  ],
  'linear-bayes': [
    t`-2\log p(\beta\mid X,y)=\frac{\lVert y-X\beta\rVert^2}{\sigma^2}+(\beta-m_0)^\top V_0^{-1}(\beta-m_0)+\mathrm{const}`,
    t`V_n^{-1}=\frac{X^\top X}{\sigma^2}+V_0^{-1},\qquad h=\frac{X^\top y}{\sigma^2}+V_0^{-1}m_0`,
    t`\begin{gathered}m_n=V_nh,\\\beta^\top V_n^{-1}\beta-2\beta^\top h=(\beta-m_n)^\top V_n^{-1}(\beta-m_n)+\mathrm{const}\end{gathered}`,
    t`\beta\mid X,y\sim\mathcal N(m_n,V_n),\qquad\widehat\beta_{\mathrm{MAP}}=\mathbb E[\beta\mid X,y]=m_n`,
    t`Y_0\mid x_0,X,y\sim\mathcal N(x_0^\top m_n,\sigma^2+x_0^\top V_nx_0)`,
    t`w\sim\mathcal N(0,\tau^2I)\quad\Longrightarrow\quad\lambda_{\mathrm{MSE}}=\frac{\sigma^2}{n\tau^2}`
  ],
  'linear-bias-variance': [
    t`\widehat f_D(x)-Y=(\widehat f_D(x)-m)+(m-f(x))-\varepsilon`,
    t`\mathbb E_D[\widehat f_D-m]=0,\qquad\mathbb E[\varepsilon\mid x]=0`,
    t`\mathbb E[(\widehat f_D-m)\varepsilon\mid x]=0`,
    t`\mathbb E_{D,Y\mid x}[(\widehat f_D(x)-Y)^2]=(m-f(x))^2+\operatorname{Var}_D(\widehat f_D(x))+\sigma^2(x)`
  ],
  'linear-loss-catalog': [
    t`\frac{\partial|y-c|}{\partial c}=\begin{cases}1,&y<c,\\-1,&y>c\end{cases}`,
    t`\frac{\partial\mathbb E[|Y-c|\mid x]}{\partial c}=P(Y<c\mid x)-P(Y>c\mid x)`,
    t`P(Y<c\mid x)-P(Y>c\mid x)=F_x(c)-(1-F_x(c))=2F_x(c)-1`,
    t`\begin{gathered}\rho_q(e)=e(q-\mathbf1[e<0]),\qquad e=y-\widehat y,\quad q\in(0,1),\\\frac{\partial\mathbb E[\rho_q(Y-c)\mid x]}{\partial c}=F_x(c)-q\end{gathered}`
  ],
  'linear-risk': [t`\begin{aligned}R(f)&=\mathbb E_{(U,Y)\sim P}[(Y-f(U))^2],\\\widehat R_{\mathrm{val}}(f)&=\frac1m\sum_{i=1}^m(y_i-f(u_i))^2\end{aligned}`],
  'linear-diagnostics': [t`\begin{gathered}e=(I-P)\varepsilon\quad\Longrightarrow\quad\operatorname{Cov}(e\mid X)=\sigma^2(I-P),\\\operatorname{Var}(e_i\mid X)=\sigma^2(1-P_{ii})\end{gathered}`],
};
