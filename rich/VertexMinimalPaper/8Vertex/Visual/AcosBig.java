import java.awt.*;
import java.math.*;

/**This file gives a high precision routine for arccos. Precision works up to about 300,
on account of the way we have hardcoded the digits of Pi.*/

public class AcosBig {


    
    public static BigDecimal Pi(int PRECISION) {
	MathContext mc = new MathContext(PRECISION+10);
	BigDecimal ONE=new BigDecimal("1");
	BigDecimal FOUR=new BigDecimal("4");
	BigDecimal p=AcosBig.atan(ONE,PRECISION+10);
        p=p.multiply(FOUR,mc);
	return p;
    }

    

    /**here x could be any real number in (-1,1).  I am not worried about
       the edge cases x= +/- 1. They never arise in my calculations.
       This routine divides between the + and - cases and reduces to the + case.*/
    
    public static BigDecimal acos(BigDecimal x,int PRECISION) {
	MathContext mc=new MathContext(PRECISION);
	BigDecimal ZERO=new BigDecimal("0");
        if (x.compareTo(ZERO) == 1) {
	    return acos1(x,PRECISION);
	}
	BigDecimal xx=ZERO.subtract(x,mc);
	BigDecimal t=acos1(xx,PRECISION);
	BigDecimal p=Pi(PRECISION);
	return p.subtract(t,mc);
    }

    /**Here x has to lie in (0,1). We rely on atan() below and we 
       again split into two cases, so that we always are computing
       atan(t) with |t|<1.   We use atan for several reasons.
       First, it has a simple Taylor series in [-1,1].  Second,
       it is amenable to an Euler-style reduction which guarantees
       uniformly fast exponential convergence.*/
    
    public static BigDecimal acos1(BigDecimal x,int PRECISION) {
	MathContext mc=new MathContext(PRECISION);
	BigDecimal x2=x.multiply(x,mc);
	BigDecimal ONE=new BigDecimal("1");
	BigDecimal HALF=new BigDecimal("0.5");
	if(x2.compareTo(HALF)==1) {
	    BigDecimal u2= acos12(x,PRECISION);
	    return u2;
	}
        BigDecimal u1= acos11(x,PRECISION);
        return u1;
    }

    
    /**Case 1: Here x has to lie in (sqrt 2/2,1)*/

    public static BigDecimal acos12(BigDecimal x,int PRECISION) {
	MathContext mc=new MathContext(PRECISION);
	BigDecimal ONE=new BigDecimal("1");
	BigDecimal TWO=new BigDecimal("2");
	BigDecimal ZERO=new BigDecimal("0");
	BigDecimal x2=x.multiply(x,mc);
	BigDecimal y=SqrtBig.sqrt(ONE.subtract(x2,mc),PRECISION);
	BigDecimal t=y.divide(x,mc);
  	BigDecimal p=Pi(PRECISION);
	p=p.divide(TWO,mc);
	BigDecimal u=atan(t,PRECISION);
	return u;
    }

    /**Case 2: Here x has to lie in (0,sqrt 2/2)*/

    public static BigDecimal acos11(BigDecimal x,int PRECISION) {
	MathContext mc=new MathContext(PRECISION);
	BigDecimal ONE=new BigDecimal("1");
	BigDecimal TWO=new BigDecimal("2");
	BigDecimal ZERO=new BigDecimal("0");
	BigDecimal x2=x.multiply(x,mc);
	BigDecimal y=SqrtBig.sqrt(ONE.subtract(x2,mc),PRECISION);
	BigDecimal t=x.divide(y,mc);
	BigDecimal u=atan(t,PRECISION);
	BigDecimal p=Pi(PRECISION);
	p=p.divide(TWO,mc);
	BigDecimal v=p.subtract(u,mc);
	return v;
    }

    /**here t is between 0 and 1.  This implements an Euler reduction
       scheme to reduce to the case when t in [-1/2,1/2]*/
    
    public static BigDecimal atan(BigDecimal t,int PRECISION) {
	MathContext mc = new MathContext(PRECISION);
	BigDecimal ZERO=new BigDecimal("0");
	BigDecimal HALF=new BigDecimal("0.5");
	BigDecimal tt=F(t,PRECISION);
	BigDecimal a1=atan1(HALF,PRECISION);
	BigDecimal a2=atan1(tt,PRECISION);
	BigDecimal a=a1.add(a2,mc);
	return a;
    }


    /**here t is always between 0 and 1/2. Aside from the case t=1/2, we
       otherwise have |t|<=1/3.  This guarantees fact convergence*/

public static BigDecimal atan1(BigDecimal x, int PRECISION) {
    MathContext mc0 = new MathContext(PRECISION + 50); // extra guard digits
    MathContext mc1 = new MathContext(PRECISION +  0); // exactly what we want
    BigDecimal sum = BigDecimal.ZERO;
    BigDecimal term = x;
    BigDecimal x2 = x.multiply(x, mc0);
    BigDecimal tol = BigDecimal.ONE.scaleByPowerOfTen(-PRECISION);
    int k = 0;
    int sign = 1;

    while (term.abs().compareTo(tol) > 0) {
        BigDecimal denom = new BigDecimal(2 * k + 1);
        BigDecimal frac = term.divide(denom, mc0);
        if(sign>0) sum = sum.add(frac, mc0);
        if(sign<0) sum = sum.subtract(frac, mc0);
        term = term.multiply(x2, mc0);
	sign=-sign;
	++k;
    }
    return sum.round(mc1);
}
    

    /**This is part of the Euler-reduction scheme*/
    
public static BigDecimal F(BigDecimal x, int PRECISION) {
        MathContext mc = new MathContext(PRECISION, RoundingMode.HALF_UP);
        BigDecimal two = new BigDecimal("2");
        BigDecimal numerator = x.multiply(two, mc).subtract(BigDecimal.ONE, mc);
        BigDecimal denominator = two.add(x, mc);
        return numerator.divide(denominator, mc);
    }
    

}
