import java.awt.event.*;
import java.awt.*;
import java.math.*;


public class NewtonsMethodBig {

    /**This is the starting seed for Newton's method.
       The points z0,z1,z2 move during the variation.  Geometrically,  
       the third coords of vertices 0,1,2 are moving and the third
       coords of vertices 6,3,4 are moving symmetrically. So, the
       whole variation just depends on z0,z1,z2*/

public static VectorBig[] seedBig(int p) {
    BigDecimal N0=new BigDecimal("0");
    BigDecimal N1=new BigDecimal("1");
    VectorBig[] V = new VectorBig[8];

    V[0] = new VectorBig(new BigDecimal("0.64"),  new BigDecimal("-0.20"), N1, p);
    V[1] = new VectorBig(new BigDecimal("-1.09"), new BigDecimal("0.38"),  N0, p);
    V[2] = new VectorBig(new BigDecimal("-0.25"), new BigDecimal("0.51"),  N0, p);
    V[3] = new VectorBig(new BigDecimal("0.78"),  new BigDecimal("0.62"),  N0, p);
    V[4] = new VectorBig(new BigDecimal("-0.78"), new BigDecimal("-0.62"), N0, p);
    V[5] = new VectorBig(new BigDecimal("0.25"),  new BigDecimal("-0.51"), N0, p);
    V[6] = new VectorBig(new BigDecimal("1.09"),  new BigDecimal("-0.38"), N0, p);
    V[7] = new VectorBig(new BigDecimal("-0.64"), new BigDecimal("0.20"),  N1, p);

    return V;
}

    /*
   public static VectorBig[] seedBig(int p) {
    BigDecimal N0=new BigDecimal("0");
    BigDecimal N1=new BigDecimal("1");
    VectorBig[] V = new VectorBig[8];
    V[0] = new VectorBig(new BigDecimal("0.78"),  new BigDecimal("-0.62"), N1, p);
    V[1] = new VectorBig(new BigDecimal("0.25"),  new BigDecimal("0.51"),  N0, p);
    V[2] = new VectorBig(new BigDecimal("1.09"),  new BigDecimal("0.38"),  N0, p);
    V[3] = new VectorBig(new BigDecimal("-0.25"), new BigDecimal("-0.51"), N0, p);
    V[4] = new VectorBig(new BigDecimal("-0.78"), new BigDecimal("0.62"),  N0, p);
    V[5] = new VectorBig(new BigDecimal("0.64"),  new BigDecimal("0.20"),  N0, p);
    V[6] = new VectorBig(new BigDecimal("-1.09"), new BigDecimal("-0.38"), N0, p);
    V[7] = new VectorBig(new BigDecimal("-0.64"), new BigDecimal("-0.20"), N1, p);
    return V;
} 
    */
    
    /**Main routine. It applies k steps of Newton's method, implemented with the high
      precision BigDecimal class.  All routine names have `Big' at the
      end as a reminder that they use BigDecimal based objects*/

    public static VectorBig[] doNewtonBig(int k,BigDecimal epsilon,int PRECISION) {
	VectorBig[] V=seedBig(PRECISION+10);
	for(int i=0;i<k;++i) {
	    V=oneStepNewtonBig(V,epsilon,PRECISION);
	}
	return V;
    }

    /**Here is one step of Newton's method. This is the core routine. It updates the values 
       of z0,z1,z2 according to the cone angle deficits and the differential 
       dependence of the cone angles on these 3 coordinates.*/
    
    public static VectorBig[] oneStepNewtonBig(VectorBig[] V,BigDecimal epsilon,int PRECISION) {
	MathContext mc = new MathContext(PRECISION);

	//gets the variation matrix and inverts it
	MatrixBig m=turnDiffSymmBig(V,epsilon,PRECISION);
	m.PRECISION=PRECISION;
	m=MatrixBig.inverse(m);
	m.PRECISION=PRECISION;

	//gets the deviation from flatness. This is what we want to correct
	BigDecimal[] d=turn3Big(V,PRECISION);
	VectorBig v=new VectorBig(d[0],d[1],d[2],PRECISION);
	VectorBig w=m.act(v);
	VectorBig[] V2=new VectorBig[8];

	//copy vector
	for(int i=0;i<8;++i) {
	    V2[i]=new VectorBig(V[i]);
	}

	//make variation according to Newton's method
	int[] g={7,6,5};
	for(int i=0;i<3;++i) {
	    int i2=g[i];
	    V2[i].x[2]=V[i].x[2].subtract(w.x[i],mc);
	    V2[i2].x[2]=V[i2].x[2].subtract(w.x[i],mc);
	}
	return V2;
    }


/** Computes the variation matrix. This is the matrix of partial derivatives 
    of the cone deficits θ₀, θ₁, θ₂ with respect to the variables z₀, z₁, z₂. */
    
    public static MatrixBig turnDiffSymmBig(VectorBig[] V,BigDecimal epsilon,int PRECISION) {
	MathContext mc = new MathContext(PRECISION);
	BigDecimal[][] d=turnDiffBig(V,epsilon,PRECISION);
	MatrixBig m=new MatrixBig();
	int[] g={7,6,5};
	for(int i=0;i<3;++i) {
	    for(int j=0;j<3;++j) {
		int i2=g[i];
  		m.a[i][j]=d[i][j].add(d[i2][j],mc);
	    }
	}
	return m;
    }

    /**This computes a more general differential dependence matrix. It is then tuned
to exactly what we want in the previous routine. We split it up this way because this
matrix  is easier to compute directly*/
    
    public static BigDecimal[][] turnDiffBig(VectorBig[] V,BigDecimal epsilon,int PRECISION) {
	int count=0;
	BigDecimal[][] m=new BigDecimal[8][3];
	for(int a=0;a<8;++a) {
	    m[count]=turnDiffBig(V,a,epsilon,PRECISION);
	    ++count;
	}
	return m;
    }

    
    /**This gets the length 8 linear stretches of the previous matrix.  I
       put it this way because I can never remember whether these are the rows are the
       columns.  I don't care whether they are rows ore cols. Things are correctly
       formatted above. */
    
    public static BigDecimal[] turnDiffBig(VectorBig[] V0,int a,BigDecimal epsilon,int PRECISION) {
    MathContext mc = new MathContext(PRECISION);
    VectorBig[] V1=perturbBig(V0,a,epsilon,PRECISION);
    BigDecimal[] d0=turn3Big(V0,PRECISION);
    BigDecimal[] d1=turn3Big(V1,PRECISION);
	BigDecimal[] diff=new BigDecimal[3];
	for(int i=0;i<3;++i) {
	    diff[i]=d1[i].subtract(d0[i],mc);
	    diff[i]=diff[i].divide(epsilon,mc);
	}
	return diff;
    }


    /** Perturbs one vertex slightly in the z-direction.
    This is used to compute the finite difference approximations 
    for the Jacobian matrix above. */
    
    public static VectorBig[] perturbBig(VectorBig[] V,int a,BigDecimal epsilon,int PRECISION) {
	MathContext mc = new MathContext(PRECISION);
	VectorBig[] V2=new VectorBig[8];
	for(int i=0;i<8;++i) {
	    V2[i]=new VectorBig(V[i]);
	}
	V2[a].x[2]=V[a].x[2].add(epsilon,mc);
	return V2;
    }

    /**This gets the first 3 cone angle deficits. This is what we want to send to 0
       iteratively with Newton's method.  We take the output from the next routine
       and normalize. We divide by 2Pi and subtract 1.  This is slightly wasteful,
       involving an extra call to Pi, but I like turns better than radians.*/
    
    public static BigDecimal[] turn3Big(VectorBig[] V,int PRECISION) {
	MathContext mc = new MathContext(PRECISION);
	BigDecimal[] d=new BigDecimal[3];
	BigDecimal TWO=new BigDecimal("2");
  	BigDecimal p=AcosBig.Pi(PRECISION);
	p=p.multiply(TWO,mc);
	BigDecimal ZERO=new BigDecimal("1");
   	for(int i=0;i<3;++i) {
  	    d[i]=turnRawBig(i,V,PRECISION);
	    d[i]=d[i].subtract(p,mc);
	}
	return d;
    }

    /**This is the un-normalized version of the previous routine.It computes
       the cone angle at the vertex whose index is te variable called link*/
    
    public static BigDecimal turnRawBig(int link,VectorBig[] V,int PRECISION) {
	MathContext mc = new MathContext(PRECISION);
        int[] cyc=edgeLink(link);
	BigDecimal a=new BigDecimal("0");
	for(int i=0;i<cyc.length;++i) {
	    int j=(i+1)%cyc.length;
	    VectorBig v0=V[link];
	    VectorBig v1=V[cyc[i]];
	    VectorBig v2=V[cyc[j]];
	    VectorBig[] TRI={v0,v1,v2};
	    a=a.add(angleBig(TRI,PRECISION),mc);
	}
	return a;
     }

    /**high precision computation of the angle.  This relies on
a high precision version of square-root and also a high precision
of acos.  The former is a simple Newton-Raphson iterative algorithm
and the second is an intricate but very nice routine based on
Taylor series.   These math functions are stored in separate files.*/
    
    public static BigDecimal angleBig(VectorBig[] V,int PRECISION) {
	MathContext mc = new MathContext(PRECISION);
	VectorBig V1=VectorBig.minus(V[1],V[0]);
	VectorBig V2=VectorBig.minus(V[2],V[0]);
	BigDecimal r11=VectorBig.dot(V1,V1);
	BigDecimal r22=VectorBig.dot(V2,V2);
	BigDecimal r12=VectorBig.dot(V1,V2);
	r11=SqrtBig.sqrt(r11,PRECISION);
	r22=SqrtBig.sqrt(r22,PRECISION);
	BigDecimal r1122=r11.multiply(r22,mc);
	BigDecimal r=r12.divide(r1122,mc);
	return AcosBig.acos(r,PRECISION);
    }

    /**This gives the links, meaning the cyclic lists of vertices incident to a
       given vertex. This is just combinatorial info from the triangulation of the torus*/

    /*
    public static int[] edgeLink(int link) {
int[][] l = {{1,2,4,6,5,3},
        {2,0,3,4,7,5},
        {0,1,5,6,7,4},
        {5,7,6,4,1,0},
        {0,2,7,1,3,6},
        {6,2,1,7,3,0},
        {0,4,3,7,2,5},
	     {1,4,2,6,3,5}};
    return l[link];
    }
    */

public static int[] edgeLink(int link) {
    int[][] l = {
	{1,6,5,7,2,3},
	{3,4,2,7,6,0},
	{0,7,1,4,5,3},
	{0,2,5,6,4,1},
	{2,1,3,6,7,5},
	{0,6,3,2,4,7},
	{0,1,7,4,3,5},
	{2,0,5,4,6,1}};
    return l[link];
}

    /**Here is the seed for the original paper*/
public static VectorBig[] seedBigOld(int p) {
    BigDecimal z0 = new BigDecimal("0.981");
    BigDecimal z1 = new BigDecimal("0.994");
    BigDecimal z2 = new BigDecimal("0.978");
    VectorBig[] V = new VectorBig[8];
    V[0] = new VectorBig(new BigDecimal("0.755"),  new BigDecimal("0.650"),  z0, p);
    V[1] = new VectorBig(new BigDecimal("-0.455"), new BigDecimal("0.345"), z1, p);
    V[2] = new VectorBig(new BigDecimal("-0.170"), new BigDecimal("1.140"), z2, p);
    V[3] = new VectorBig(new BigDecimal("0.455"),  new BigDecimal("-0.345"), z1, p);
    V[4] = new VectorBig(new BigDecimal("-0.755"), new BigDecimal("-0.650"), z0, p);
    V[5] = new VectorBig(new BigDecimal("-0.090"), new BigDecimal("0.665"), new BigDecimal("0"), p);
    V[6] = new VectorBig(new BigDecimal("0.170"),  new BigDecimal("-1.140"), z2, p);
    V[7] = new VectorBig(new BigDecimal("0.090"),  new BigDecimal("-0.665"), new BigDecimal("0"), p);
    return V;
}

    
}



