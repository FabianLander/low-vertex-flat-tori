import java.awt.*;
import java.math.*;

/**This class does high precision operations on
   vectors*/


public class VectorBig {
    BigDecimal[] x=new BigDecimal[3];
    int PRECISION;

    public VectorBig() {}

    public VectorBig(VectorBig V) {
	for(int i=0;i<3;++i) x[i]=new BigDecimal(V.x[i].toString());
	PRECISION=V.PRECISION;
    }
    
    public VectorBig(BigDecimal x0,BigDecimal y0,BigDecimal z0,int p) {
	x[0]=new BigDecimal(x0.toString());
	x[1]=new BigDecimal(y0.toString());
	x[2]=new BigDecimal(z0.toString());
	PRECISION=p;
    }

    public VectorBig(String x0,String y0,String z0,int p) {
	x[0]=new BigDecimal(x0);
	x[1]=new BigDecimal(y0);
	x[2]=new BigDecimal(z0);
	PRECISION=p;
    }
    
    public static VectorBig minus(VectorBig V,VectorBig W) {
	VectorBig X=new VectorBig();
	for(int i=0;i<3;++i) X.x[i]=V.x[i].subtract(W.x[i],new MathContext(V.PRECISION));
	X.PRECISION=V.PRECISION;
	return X;
    }
    

    public static BigDecimal  dot(VectorBig v,VectorBig w) {
	BigDecimal d=new BigDecimal("0");
	for(int i=0;i<3;++i) {
	    d=d.add(v.x[i].multiply(w.x[i]),new MathContext(w.PRECISION));
	}
	return d;
    }

    public void print() {
	System.out.println("------VECTOR------");
	for(int i=0;i<3;++i) System.out.println(x[i].toString()+"  ");
	System.out.println("------------------");
    }
    
}

