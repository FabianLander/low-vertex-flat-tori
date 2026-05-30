import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;
import java.util.Arrays;


public class GoodPath {

    /**we will go with 300 digits of precision.  This seems sufficient.
       The integer k refers to how far we have moved on the path away
       from the golden valley*/

    public static TorusBig diamond(BigDecimal x,BigDecimal y,double s0) {
	MathContext mc=new MathContext(300);
        BigDecimal s=BigDecimal.valueOf(s0);
	BigDecimal x1=X1(x,y,300);
	BigDecimal x2=X2(x,y,300);
	TorusBig T=master(s,x,y,x1,x2,300);
	return T;
    }



    public static TorusBig diamond(BigDecimal x,BigDecimal y,int k) {
	BigDecimal s = BigDecimal.ONE.movePointLeft(k);
	MathContext mc=new MathContext(300);
	BigDecimal x1=X1(x,y,300);
	BigDecimal x2=X2(x,y,300);
	TorusBig T=master(s,x,y,x1,x2,300);
	return T;
    }




    public static TorusBig master(
    BigDecimal s, BigDecimal x, BigDecimal y,
    BigDecimal X1, BigDecimal X2,
    int digits
) {
    MathContext mc = new MathContext(digits);

    BigDecimal ZERO = BigDecimal.ZERO;
    BigDecimal ONE  = BigDecimal.ONE;
    BigDecimal TWO  = new BigDecimal("2");

    // Powers
    BigDecimal s2 = s.multiply(s, mc);
    BigDecimal x2 = x.multiply(x, mc);
    BigDecimal y2 = y.multiply(y, mc);

    // Helpers
    BigDecimal sqrt2 = SqrtBig.sqrt(new BigDecimal("2"), digits);
    BigDecimal sqrtx = SqrtBig.sqrt(x, digits);

    // a0,a1,a2
    BigDecimal a0 = a0(x, y, X1, X2, digits);
    BigDecimal a1 = a1(x, y, X1, X2, digits);
    BigDecimal a2 = a2(x, y, X1, X2, digits);

    // Common fragments
    BigDecimal denom = TWO.multiply(x, mc).subtract(x2, mc).add(y2, mc);           // 2x - x^2 + y^2
    BigDecimal X0 = TWO.negate().multiply(x, mc).multiply(y, mc)
                      .divide(denom, mc);                                          // X0 = -2xy/(2x - x^2 + y^2)
    BigDecimal bump  = TWO.multiply(sqrt2, mc).multiply(sqrtx, mc).multiply(y, mc);// 2√2 √x y

    BigDecimal[][] d = new BigDecimal[8][3];

    // --- first 4 vertices ---
    d[0][0] = TWO.multiply(x, mc).subtract(x2, mc).subtract(y2, mc);
    d[0][1] = X1.multiply(s2, mc);
    d[0][2] = a0.multiply(s2, mc);

    d[1][0] = s.add(x, mc).subtract(TWO.multiply(x2, mc), mc);
    d[1][1] = y.subtract(TWO.multiply(x, mc).multiply(y, mc), mc)
                .add(X0.multiply(s, mc), mc);                                      // y - 2xy + X0 s
    d[1][2] = a1.multiply(s2, mc).add(bump, mc);

    d[2][0] = X1.multiply(s2, mc).add(x, mc).subtract(x2, mc).subtract(y2, mc);
    d[2][1] = X2.multiply(s2, mc).subtract(y, mc);
    d[2][2] = a2.multiply(s2, mc);

    d[3][0] = new BigDecimal("3").multiply(x, mc).subtract(x2, mc).subtract(y2, mc);
    d[3][1] = y;
    d[3][2] = ZERO;

    // --- apply symmetry: vertex i -> 7 - i under (x,y,z)->(-x,-y,z) ---
    for (int i = 0; i < 4; i++) {
        int j = 7 - i;
        d[j][0] = d[i][0].negate(mc);
        d[j][1] = d[i][1].negate(mc);
        d[j][2] = d[i][2];
    }

    // --- assemble torus ---

   TorusBig T = new TorusBig();
   T.U[2] = new VectorBig(d[0][0], d[0][1], d[0][2], digits);
   T.U[0] = new VectorBig(d[1][0], d[1][1], d[1][2], digits);
   T.U[1] = new VectorBig(d[2][0], d[2][1], d[2][2], digits);
   T.U[3] = new VectorBig(d[3][0], d[3][1], d[3][2], digits);
   T.U[4] = new VectorBig(d[4][0], d[4][1], d[4][2], digits);
   T.U[6] = new VectorBig(d[5][0], d[5][1], d[5][2], digits);
   T.U[7] = new VectorBig(d[6][0], d[6][1], d[6][2], digits);
   T.U[5] = new VectorBig(d[7][0], d[7][1], d[7][2], digits);
    
    return T;
}


public static BigDecimal a0(BigDecimal x, BigDecimal y, BigDecimal X1, BigDecimal X2, int digits) {
    MathContext mc = new MathContext(digits);

    BigDecimal x2 = x.multiply(x, mc);
    BigDecimal x3 = x2.multiply(x, mc);
    BigDecimal x4 = x3.multiply(x, mc);

    BigDecimal y2 = y.multiply(y, mc);
    BigDecimal y3 = y2.multiply(y, mc);
    BigDecimal y4 = y3.multiply(y, mc);

    BigDecimal beta0 = (new BigDecimal("2")).multiply(x, mc).subtract(x2, mc).add(y2, mc);
    BigDecimal beta1 = x2.subtract((new BigDecimal("2")).multiply(x, mc), mc).add(y2, mc);

    BigDecimal sqrt2x = SqrtBig.sqrt((new BigDecimal("2")).multiply(x, mc), digits);
    BigDecimal denCommon = sqrt2x.multiply(
        (new BigDecimal("2")).multiply(x2, mc)
            .subtract((new BigDecimal("2")).multiply(x.multiply(x2, mc), mc), mc)
            .add(x4, mc)
            .add((new BigDecimal("2")).multiply(x, mc).multiply(y2, mc), mc)
            .add((new BigDecimal("2")).multiply(x2, mc).multiply(y2, mc), mc)
            .add(y4, mc),
        mc
    );

    BigDecimal numA0 = x.multiply(y, mc).multiply(
        (new BigDecimal("4")).multiply(x2, mc)
            .subtract((new BigDecimal("6")).multiply(x3, mc), mc)
            .add((new BigDecimal("5")).multiply(x4, mc), mc)
            .add((new BigDecimal("2")).multiply(x, mc).multiply(y2, mc), mc)
            .add((new BigDecimal("6")).multiply(x2, mc).multiply(y2, mc), mc)
            .add(y4, mc),
        mc
    );
    BigDecimal denA0 = ( (new BigDecimal("2")).multiply(x, mc).subtract(BigDecimal.ONE, mc) )
            .multiply(beta0.multiply(beta0, mc), mc);
    BigDecimal A0 = numA0.divide(denA0, mc);

    BigDecimal A02 = x.multiply(
        (new BigDecimal("2")).multiply(x2, mc)
            .subtract((new BigDecimal("2")).multiply(x3, mc), mc)
            .add(x4, mc)
            .subtract((new BigDecimal("2")).multiply(x, mc).multiply(y, mc), mc)
            .subtract(x2.multiply(y, mc), mc)
            .add((new BigDecimal("2")).multiply(x, mc).multiply(y2, mc), mc)
            .add((new BigDecimal("2")).multiply(x2, mc).multiply(y2, mc), mc)
            .subtract(y3, mc)
            .add(y4, mc),
        mc
    );

    BigDecimal t1 = (new BigDecimal("2")).multiply(x, mc).add(x2, mc).add(y2, mc);
    BigDecimal t2 = ( (new BigDecimal("0")).subtract((new BigDecimal("2")).multiply(x3, mc), mc) )
        .add(x4, mc)
        .add((new BigDecimal("6")).multiply(x, mc).multiply(y2, mc), mc)
        .add((new BigDecimal("2")).multiply(x2, mc).multiply(y2, mc), mc)
        .add(y4, mc);
    BigDecimal A03 = t1.multiply(t2, mc).divide((new BigDecimal("4")).multiply(beta1, mc), mc).negate(mc);

    BigDecimal num = A0.add(A02.multiply(X1, mc), mc).add(A03.multiply(X2, mc), mc);
    return num.divide(denCommon, mc);
}


public static BigDecimal a1(BigDecimal x, BigDecimal y, BigDecimal X1, BigDecimal X2, int digits) {
    MathContext mc = new MathContext(digits);

    BigDecimal x2 = x.multiply(x, mc);
    BigDecimal x3 = x2.multiply(x, mc);
    BigDecimal x4 = x3.multiply(x, mc);

    BigDecimal y2 = y.multiply(y, mc);
    BigDecimal y4 = y2.multiply(y2, mc);

    BigDecimal beta0 = (new BigDecimal("2")).multiply(x, mc).subtract(x2, mc).add(y2, mc);
    BigDecimal beta1 = x2.subtract((new BigDecimal("2")).multiply(x, mc), mc).add(y2, mc);

    BigDecimal sqrt2x = SqrtBig.sqrt((new BigDecimal("2")).multiply(x, mc), digits);
    BigDecimal denCommon = sqrt2x.multiply(
        (new BigDecimal("2")).multiply(x2, mc)
            .subtract((new BigDecimal("2")).multiply(x.multiply(x2, mc), mc), mc)
            .add(x4, mc)
            .add((new BigDecimal("2")).multiply(x, mc).multiply(y2, mc), mc)
            .add((new BigDecimal("2")).multiply(x2, mc).multiply(y2, mc), mc)
            .add(y4, mc),
        mc
    );

    BigDecimal A1 = (new BigDecimal("2")).multiply(x, mc).multiply(y, mc).multiply(
        (new BigDecimal("4")).multiply(x2, mc)
            .subtract((new BigDecimal("9")).multiply(x3, mc), mc)
            .add((new BigDecimal("7")).multiply(x4, mc), mc)
            .add((new BigDecimal("3")).multiply(x, mc).multiply(y2, mc), mc)
            .add(y4, mc),
        mc
    ).divide( ( (new BigDecimal("2")).multiply(x, mc).subtract(BigDecimal.ONE, mc) )
              .multiply(beta0.multiply(beta0, mc), mc), mc);

    BigDecimal s = (new BigDecimal("2")).multiply(x, mc).add(x2, mc).add(y2, mc);
    BigDecimal A12 = y.negate(mc).multiply(s.multiply(s, mc), mc);

    BigDecimal A13 = (x.subtract((new BigDecimal("2")).multiply(y2, mc), mc))
        .multiply(s.multiply(s, mc), mc)
        .divide( (new BigDecimal("2")).multiply(beta1, mc), mc);

    BigDecimal num = A1.add(A12.multiply(X1, mc), mc).add(A13.multiply(X2, mc), mc);
    return num.divide(denCommon, mc);
}

public static BigDecimal a2(BigDecimal x, BigDecimal y, BigDecimal X1, BigDecimal X2, int digits) {
    MathContext mc = new MathContext(digits);

    BigDecimal x2 = x.multiply(x, mc);
    BigDecimal x3 = x2.multiply(x, mc);
    BigDecimal x4 = x3.multiply(x, mc);
    BigDecimal x5 = x4.multiply(x, mc);
    BigDecimal x6 = x5.multiply(x, mc);
    BigDecimal x7 = x6.multiply(x, mc);

    BigDecimal y2 = y.multiply(y, mc);
    BigDecimal y3 = y2.multiply(y, mc);
    BigDecimal y4 = y3.multiply(y, mc);
    BigDecimal y5 = y4.multiply(y, mc);
    BigDecimal y6 = y5.multiply(y, mc);

    BigDecimal beta0 = (new BigDecimal("2")).multiply(x, mc).subtract(x2, mc).add(y2, mc);
    BigDecimal beta1 = x2.subtract((new BigDecimal("2")).multiply(x, mc), mc).add(y2, mc);

    BigDecimal sqrt2x = SqrtBig.sqrt((new BigDecimal("2")).multiply(x, mc), digits);
    BigDecimal denCommon = sqrt2x.multiply(
        (new BigDecimal("2")).multiply(x2, mc)
            .subtract((new BigDecimal("2")).multiply(x.multiply(x2, mc), mc), mc)
            .add(x4, mc)
            .add((new BigDecimal("2")).multiply(x, mc).multiply(y2, mc), mc)
            .add((new BigDecimal("2")).multiply(x2, mc).multiply(y2, mc), mc)
            .add(y4, mc),
        mc
    );

    BigDecimal A2 = (new BigDecimal("2")).multiply(x, mc).multiply(y, mc)
        .multiply( ( (new BigDecimal("0")).subtract((new BigDecimal("2")).multiply(x, mc), mc).add((new BigDecimal("3")).multiply(x2, mc), mc).subtract(y2, mc) )
                   .multiply(x2.add(y2, mc), mc), mc)
        .divide( ( (new BigDecimal("2")).multiply(x, mc).subtract(BigDecimal.ONE, mc) )
                 .multiply(beta0.multiply(beta0, mc), mc), mc);

    BigDecimal A22 = y.negate(mc).multiply(
        (new BigDecimal("6")).multiply(x2, mc)
            .add(x4, mc)
            .add((new BigDecimal("4")).multiply(x, mc).multiply(y2, mc), mc)
            .add((new BigDecimal("2")).multiply(x2, mc).multiply(y2, mc), mc)
            .add(y4, mc),
        mc
    );

    BigDecimal P = (new BigDecimal("0"))
        .subtract((new BigDecimal("4")).multiply(x4, mc), mc)
        .add((new BigDecimal("12")).multiply(x5, mc), mc)
        .subtract((new BigDecimal("9")).multiply(x6, mc), mc)
        .add((new BigDecimal("2")).multiply(x7, mc), mc)
        .subtract((new BigDecimal("12")).multiply(x2, mc).multiply(y2, mc), mc)
        .subtract((new BigDecimal("12")).multiply(x3, mc).multiply(y2, mc), mc)
        .subtract((new BigDecimal("11")).multiply(x4, mc).multiply(y2, mc), mc)
        .add((new BigDecimal("6")).multiply(x5, mc).multiply(y2, mc), mc)
        .subtract((new BigDecimal("8")).multiply(x, mc).multiply(y4, mc), mc)
        .subtract((new BigDecimal("3")).multiply(x2, mc).multiply(y4, mc), mc)
        .add((new BigDecimal("6")).multiply(x3, mc).multiply(y4, mc), mc)
        .subtract(y6, mc)
        .add((new BigDecimal("2")).multiply(x, mc).multiply(y6, mc), mc);
    BigDecimal A23 = P.divide( (new BigDecimal("2")).multiply(beta1, mc), mc);

    BigDecimal num = A2.add(A22.multiply(X1, mc), mc).add(A23.multiply(X2, mc), mc);
    return num.divide(denCommon, mc);
}


    /**This is the magic point*/
    
    
public static BigDecimal X2(BigDecimal x, BigDecimal y, int digits) {

    MathContext mc = new MathContext(digits);

    BigDecimal x2 = x.multiply(x, mc);
    BigDecimal x3 = x2.multiply(x, mc);
    BigDecimal x4 = x3.multiply(x, mc);
    BigDecimal x5 = x4.multiply(x, mc);
    BigDecimal x6 = x5.multiply(x, mc);
    BigDecimal x7 = x6.multiply(x, mc);
    BigDecimal x8 = x7.multiply(x, mc);

    BigDecimal y2 = y.multiply(y, mc);
    BigDecimal y3 = y2.multiply(y, mc);
    BigDecimal y4 = y3.multiply(y, mc);
    BigDecimal y5 = y4.multiply(y, mc);
    BigDecimal y6 = y5.multiply(y, mc);
    BigDecimal y7 = y6.multiply(y, mc);


    // ---------- Numerator ----------
    BigDecimal poly =
        x4.multiply(new BigDecimal("48"), mc)
        .add(x5.multiply(new BigDecimal("-72"), mc), mc)
        .add(x6.multiply(new BigDecimal("48"), mc), mc)
        .add(x7.multiply(new BigDecimal("18"), mc), mc)
        .add(x5.multiply(y, mc).multiply(new BigDecimal("20"), mc), mc)
        .add(x6.multiply(y, mc).multiply(new BigDecimal("15"), mc), mc)
        .add(x3.multiply(y2, mc).multiply(new BigDecimal("24"), mc), mc)
        .add(x4.multiply(y2, mc).multiply(new BigDecimal("48"), mc), mc)
        .add(x5.multiply(y2, mc).multiply(new BigDecimal("30"), mc), mc)
        .add(x2.multiply(y3, mc).multiply(new BigDecimal("32"), mc), mc)
        .add(x3.multiply(y3, mc).multiply(new BigDecimal("40"), mc), mc)
        .add(x4.multiply(y3, mc).multiply(new BigDecimal("33"), mc), mc)
        .add(x3.multiply(y4, mc).multiply(new BigDecimal("6"), mc), mc)
        .add(x.multiply(y5, mc).multiply(new BigDecimal("20"), mc), mc)
        .add(x2.multiply(y5, mc).multiply(new BigDecimal("21"), mc), mc)
        .add(x.multiply(y6, mc).multiply(new BigDecimal("-6"), mc), mc)
        .add(y7.multiply(new BigDecimal("3"), mc), mc);

    BigDecimal numerator =
        x.multiply(y, mc)
         .multiply(new BigDecimal("4"), mc)
         .multiply(
             (x2.subtract((new BigDecimal("2")).multiply(x, mc), mc).add(y2, mc)),
             mc
         )
         .multiply(poly, mc);

    // ---------- Denominator ----------
    BigDecimal den1 = new BigDecimal("3");
    BigDecimal den2 = BigDecimal.ONE.subtract(x.multiply(new BigDecimal("2"), mc), mc);
    BigDecimal den3 = x2.subtract(x.multiply(new BigDecimal("2"), mc), mc).subtract(y2, mc);
    BigDecimal den4 = x2.add(x.multiply(new BigDecimal("2"), mc), mc).add(y2, mc);

    BigDecimal Q =
        x5.multiply(new BigDecimal("-8"), mc)
        .add(x6.multiply(new BigDecimal("24"), mc), mc)
        .add(x7.multiply(new BigDecimal("-18"), mc), mc)
        .add(x8.multiply(new BigDecimal("4"), mc), mc);

    Q = x5.multiply(new BigDecimal("-8"), mc)
        .add(x6.multiply(new BigDecimal("24"), mc), mc)
        .add(x7.multiply(new BigDecimal("-18"), mc), mc)
        .add(x8.multiply(new BigDecimal("4"), mc), mc)
        .add(x4.multiply(y, mc).multiply(new BigDecimal("20"), mc), mc)
        .add(x6.multiply(y, mc).multiply(new BigDecimal("-5"), mc), mc)
        .add(x3.multiply(y2, mc).multiply(new BigDecimal("-24"), mc), mc)
        .add(x4.multiply(y2, mc).multiply(new BigDecimal("-24"), mc), mc)
        .add(x5.multiply(y2, mc).multiply(new BigDecimal("-22"), mc), mc)
        .add(x6.multiply(y2, mc).multiply(new BigDecimal("12"), mc), mc)
        .add(x2.multiply(y3, mc).multiply(new BigDecimal("-12"), mc), mc)
        .add(x3.multiply(y3, mc).multiply(new BigDecimal("-8"), mc), mc)
        .add(x4.multiply(y3, mc).multiply(new BigDecimal("-11"), mc), mc)
        .add(x2.multiply(y4, mc).multiply(new BigDecimal("-16"), mc), mc)
        .add(x3.multiply(y4, mc).multiply(new BigDecimal("-6"), mc), mc)
        .add(x4.multiply(y4, mc).multiply(new BigDecimal("12"), mc), mc)
        .add(x.multiply(y5, mc).multiply(new BigDecimal("-8"), mc), mc)
        .add(x2.multiply(y5, mc).multiply(new BigDecimal("-7"), mc), mc)
        .add(x.multiply(y6, mc).multiply(new BigDecimal("-2"), mc), mc)
        .add(x2.multiply(y6, mc).multiply(new BigDecimal("4"), mc), mc)
        .add(y7.multiply(new BigDecimal("-1"), mc), mc);

    BigDecimal denominator =
        den1.multiply(den2, mc)
            .multiply(den3.pow(2, mc), mc)
            .multiply(den4, mc)
            .multiply(Q, mc);

    return numerator.divide(denominator, mc);
}

    
public static BigDecimal X1(BigDecimal x, BigDecimal y, int digits) {

    MathContext mc = new MathContext(digits);

    BigDecimal x2 = x.multiply(x, mc);
    BigDecimal x3 = x2.multiply(x, mc);
    BigDecimal x4 = x3.multiply(x, mc);
    BigDecimal x5 = x4.multiply(x, mc);
    BigDecimal x6 = x5.multiply(x, mc);
    BigDecimal x7 = x6.multiply(x, mc);
    BigDecimal x8 = x7.multiply(x, mc);
    BigDecimal x9 = x8.multiply(x, mc);

    BigDecimal y2 = y.multiply(y, mc);
    BigDecimal y3 = y2.multiply(y, mc);
    BigDecimal y4 = y3.multiply(y, mc);
    BigDecimal y5 = y4.multiply(y, mc);
    BigDecimal y6 = y5.multiply(y, mc);
    BigDecimal y7 = y6.multiply(y, mc);
    BigDecimal y8 = y7.multiply(y, mc);

    // ---------- Numerator ----------
    BigDecimal poly =
          x5.multiply(new BigDecimal("-40"), mc)
        .add(x6.multiply(new BigDecimal("60"), mc), mc)
        .add(x7.multiply(new BigDecimal("-30"), mc), mc)
        .add(x8.multiply(new BigDecimal("-25"), mc), mc)
        .add(x9.multiply(new BigDecimal("15"), mc), mc)
        .add(x3.multiply(y2, mc).multiply(new BigDecimal("24"), mc), mc)
        .add(x4.multiply(y2, mc).multiply(new BigDecimal("-24"), mc), mc)
        .add(x5.multiply(y2, mc).multiply(new BigDecimal("-50"), mc), mc)
        .add(x6.multiply(y2, mc).multiply(new BigDecimal("-54"), mc), mc)
        .add(x7.multiply(y2, mc).multiply(new BigDecimal("48"), mc), mc)
        .add(x2.multiply(y4, mc).multiply(new BigDecimal("-20"), mc), mc)
        .add(x3.multiply(y4, mc).multiply(new BigDecimal("-42"), mc), mc)
        .add(x4.multiply(y4, mc).multiply(new BigDecimal("-36"), mc), mc)
        .add(x5.multiply(y4, mc).multiply(new BigDecimal("54"), mc), mc)
        .add(x.multiply(y6, mc).multiply(new BigDecimal("-22"), mc), mc)
        .add(x2.multiply(y6, mc).multiply(new BigDecimal("-10"), mc), mc)
        .add(x3.multiply(y6, mc).multiply(new BigDecimal("24"), mc), mc)
        .add(y8.multiply(new BigDecimal("-3"), mc), mc)
        .add(x.multiply(y8, mc).multiply(new BigDecimal("3"), mc), mc);

    BigDecimal numerator =
        poly.multiply(x.multiply(y, mc).multiply(new BigDecimal("4"), mc), mc).negate(mc);

    // ---------- Denominator ----------
    BigDecimal den1 = new BigDecimal("3");
    BigDecimal den2 = BigDecimal.ONE.subtract(x.multiply(new BigDecimal("2"), mc), mc);
    BigDecimal den3 = x2.subtract(x.multiply(new BigDecimal("2"), mc), mc).subtract(y2, mc);
    BigDecimal den4 = x2.add(x.multiply(new BigDecimal("2"), mc), mc).add(y2, mc);

    BigDecimal Q =
          x5.multiply(new BigDecimal("-8"), mc)
        .add(x6.multiply(new BigDecimal("24"), mc), mc)
        .add(x7.multiply(new BigDecimal("-18"), mc), mc)
        .add(x8.multiply(new BigDecimal("4"), mc), mc)
        .add(x4.multiply(y, mc).multiply(new BigDecimal("20"), mc), mc)
        .add(x6.multiply(y, mc).multiply(new BigDecimal("-5"), mc), mc)
        .add(x3.multiply(y2, mc).multiply(new BigDecimal("-24"), mc), mc)
        .add(x4.multiply(y2, mc).multiply(new BigDecimal("-24"), mc), mc)
        .add(x5.multiply(y2, mc).multiply(new BigDecimal("-22"), mc), mc)
        .add(x6.multiply(y2, mc).multiply(new BigDecimal("12"), mc), mc)
        .add(x2.multiply(y3, mc).multiply(new BigDecimal("-12"), mc), mc)
        .add(x3.multiply(y3, mc).multiply(new BigDecimal("-8"), mc), mc)
        .add(x4.multiply(y3, mc).multiply(new BigDecimal("-11"), mc), mc)
        .add(x2.multiply(y4, mc).multiply(new BigDecimal("-16"), mc), mc)
        .add(x3.multiply(y4, mc).multiply(new BigDecimal("-6"), mc), mc)
        .add(x4.multiply(y4, mc).multiply(new BigDecimal("12"), mc), mc)
        .add(x.multiply(y5, mc).multiply(new BigDecimal("-8"), mc), mc)
        .add(x2.multiply(y5, mc).multiply(new BigDecimal("-7"), mc), mc)
        .add(x.multiply(y6, mc).multiply(new BigDecimal("-2"), mc), mc)
        .add(x2.multiply(y6, mc).multiply(new BigDecimal("4"), mc), mc)
        .add(y7.multiply(new BigDecimal("-1"), mc), mc);

    BigDecimal denominator =
        den1.multiply(den2, mc)
            .multiply(den3.pow(2, mc), mc)
            .multiply(den4, mc)
            .multiply(Q, mc);

    denominator = denominator.negate(mc);

    return numerator.divide(denominator, mc);
}




    
    
}
