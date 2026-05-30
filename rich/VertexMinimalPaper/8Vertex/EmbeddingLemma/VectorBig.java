import java.awt.*;
import java.math.*;

public class VectorBig {
    BigInteger[] x=new BigInteger[3];

    public VectorBig() {}

    public VectorBig(VectorBig V) {
	for(int i=0;i<3;++i) x[i]=new BigInteger(V.x[i].toString());
    }
    
    public VectorBig(BigInteger x0,BigInteger y0,BigInteger z0) {
	x[0]=new BigInteger(x0.toString());
	x[1]=new BigInteger(y0.toString());
	x[2]=new BigInteger(z0.toString());
    }
    
    public VectorBig(int a,int b,int c) {
	x[0]=BigInteger.valueOf(a);
	x[1]=BigInteger.valueOf(b);
	x[2]=BigInteger.valueOf(c);
    }

    public VectorBig(String x0,String y0,String z0) {
	x[0]=new BigInteger(x0);
	x[1]=new BigInteger(y0);
	x[2]=new BigInteger(z0);
    }


    
    public static VectorBig minus(VectorBig V,VectorBig W) {
	VectorBig X=new VectorBig();
	for(int i=0;i<3;++i) X.x[i]=V.x[i].subtract(W.x[i]);
	return X;
    }
    

    public static BigInteger  dot(VectorBig v,VectorBig w) {
	BigInteger d=new BigInteger("0");
	for(int i=0;i<3;++i) {
	    d=d.add(v.x[i].multiply(w.x[i]));
	}
	return d;
    }

    
   public static VectorBig cross(VectorBig u, VectorBig v) {
      VectorBig w = new VectorBig();
      w.x[0] = u.x[1].multiply(v.x[2]).subtract(u.x[2].multiply(v.x[1]));
      w.x[1] = u.x[2].multiply(v.x[0]).subtract(u.x[0].multiply(v.x[2]));
      w.x[2] = u.x[0].multiply(v.x[1]).subtract(u.x[1].multiply(v.x[0]));
      return w;
   }


    public static BigInteger tripleProduct(VectorBig u, VectorBig v, VectorBig w) {
	return dot(u,cross(v,w));
    }
    

    public void print() {
	System.out.println("------VECTOR------");
	for(int i=0;i<3;++i) System.out.println(x[i].toString()+"  ");
	System.out.println("------------------");
    }
    
}

