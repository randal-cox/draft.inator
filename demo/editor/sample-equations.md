# How many interviews are enough?

A study that samples people one at a time keeps meeting the same ideas, and now and then a new one. This sample
shows draft.inator's maths: LaTeX between dollar signs, numbered equations with labels, and references that always
match. Move {ref eq:at-least-once} below {ref eq:depth} and watch every number, and every reference, follow.

Suppose an idea is held by a share $p$ of the population. After $n$ independent interviews, the chance of never
meeting it is $(1-p)^n$, so the chance of meeting it at least once is

$$ P_{\text{seen}} = 1 - (1-p)^{n} $$ {#eq:at-least-once}

To be confident at level $C$ (such as $C = 0.95$) of meeting every idea held by at least a share $p$, solve
{ref eq:at-least-once} for $n$:

$$ n \ge \frac{\ln(1-C)}{\ln(1-p)} $$ {#eq:sample-size}

{figure /uploads/red-mask.png | alt:"A red carved mask" | caption:"A sample figure, numbered by its label" | label:fig:first | width:half}

Read the other way, {ref eq:sample-size} says how rare an idea a study of $n$ interviews can still expect to find:

$$ p \ge 1 - e^{\ln(1-C)/n} $$ {#eq:depth}

Requiring an idea to turn up at least $k$ times sums the binomial terms below $k$:

$$ C \le 1 - \sum_{j=0}^{k-1} \binom{n}{j} p^{j} (1-p)^{n-j} $$ {#eq:repeats}

{figure /uploads/blue-mask.png | alt:"A blue carved mask" | caption:"A second figure" | label:fig:second | width:half}

{ref fig:first} comes before {ref fig:second}; swap them and the captions and these words change together. A worked
example needs no number: with $C = 0.95$ and $p = 0.10$,

$$ n \ge \frac{\ln 0.05}{\ln 0.90} \approx 28.4 $$

so 29 interviews. Prices stay prose: it cost $5 and $10 to print. A reference to a label that doesn't exist, such as
{ref eq:missing}, is marked, and so is maths with a mistake, such as $\frac{a}{b$.
