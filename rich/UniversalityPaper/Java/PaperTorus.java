import java.awt.event.*;
import java.awt.*;
import java.math.*;

public class PaperTorus {

    /**This is the one from my initial preprint*/
    public static Torus shapeClassic() {
    
	double[][] d = {
    {-0.090,  0.665, 0.0               }, 
    { 0.170, -1.14,  0.9765388347031215}, 
    { 0.455, -0.345, 0.9902816243343043}, 
    { 0.755,  0.65,  0.9805057158597784}, 
    {-0.755, -0.65,  0.9805057158597784}, 
    {-0.455,  0.345, 0.9902816243343043},  
    {-0.170,  1.14,  0.9765388347031215},
    { 0.090, -0.665, 0.0               }
};
    
    Torus T = new Torus();
    for (int i = 0; i < 8; ++i) T.U[i] = new Vector(d[i]);
    return T;
};



    /**This one is an improvement. It has simpler coords*/

    public static Torus shape() {
    double z0 = 0.0082275214556137;
    double z1 = 0.0048531277065192;
    double z2 = 0.0206663266698443;

    double[][] d = {
        { 0.64, -0.20, 1 },
        {-1.09, +0.38, z2},
        {-0.25, +0.51, z1},
        { 0.78, +0.62, z0},
        {-0.78, -0.62, z0},
        { 0.25, -0.51, z1},
        { 1.09, -0.38, z2},
        {-0.64, +0.20, 1 },
    };

    Torus T = new Torus();
    for (int i = 0; i < 8; ++i) T.U[i] = new Vector(d[i]);
    return T;
}



    public static  Complex goldenParameter() {
	double a=.5*Math.sqrt(5+2*Math.sqrt(5));
	return new Complex(.5,a);
    }


    /**This is the diamond path*/
    public static Torus diamond(Complex z,double s) {
	BigDecimal x=BigDecimal.valueOf(z.x);
	BigDecimal y=BigDecimal.valueOf(z.y);
 	TorusBig T=GoodPath.diamond(x,y,s);
	Torus T2= Torus.toDouble(T);
	T2.U=NewtonsMethod.doNewton(T2.U,10);
	return T2;
    }
    
    public static Torus diamond(Complex z){
    double x = z.x;
    double y = z.y;
    double S = Math.sqrt(8*x) * y;  // redefined S

    double[][] d = {
        {-2*x*x+x, y-2*x*y, S},
        {-x*x+x-y*y, -y, 0},
        {-x*x+2*x-y*y, 0, 0},
        {-x*x+3*x-y*y, y, 0},
        {+x*x-3*x+y*y, -y, 0},
        {+x*x-2*x+y*y, 0, 0},
        {+x*x-x+y*y, y, 0},
        {+2*x*x-x, 2*x*y-y, S}
    };

    Torus T = new Torus();
    for (int i = 0; i < 8; ++i) {
        T.U[i] = new Vector(d[i]);
    }
    return T;
}
    
    /**involves newton's method*/
    
    public static Torus toTorus(Complex[] Z) {
	Torus T1=new Torus();
	double[] h={1,0,0,0,0,0,0,1};
	for(int i=0;i<8;++i) T1.U[i]=new Vector(0,0,h[i]);
	int[] a={0,1,2,3};
	int[] b={7,6,5,4};
	for(int i=0;i<4;++i) {
	    T1.U[a[i]].x[0]=Z[i].x;
	    T1.U[a[i]].x[1]=Z[i].y;
	    T1.U[b[i]].x[0]=-Z[i].x;
	    T1.U[b[i]].x[1]=-Z[i].y;
	}
        Vector[] v = NewtonsMethod.doNewton(T1.U,20);
	    Torus T2=new Torus();
	    T2.U=v;
	
	return T2;
    }


    public static Complex[] fromTorus(Torus T) {
	Complex[] Z=new Complex[4];
	for(int i=0;i<4;++i) {
  	    Z[i]=new Complex(T.U[i].x[0],T.U[i].x[1]);
	}
	return Z;
    }

    public static double diamondQuality(Torus T0,Complex z) {
	Complex[] Z=fromTorus(T0);
	Torus T=diamond(z);
	Complex[] W=fromTorus(T);
	double[] d=new double[4];
	double sum=0;
	for(int i=0;i<4;++i) {
	    sum=sum+Complex.dist(Z[i],W[i]);
	}
	return sum;
    }

    public static Torus align(int freeze,Torus A,Torus T) {
	Complex z0=new Complex(A.U[freeze].x[0],A.U[freeze].x[1]);
	Complex z1=new Complex(T.U[freeze].x[0],T.U[freeze].x[1]);
	Complex z=Complex.divide(z0,z1);
	Torus T2=new Torus();
	for(int i=0;i<8;++i) {
	    Complex Z=new Complex(T.U[i].x[0],T.U[i].x[1]);
	    Z=Complex.times(Z,z);
	    T2.U[i]=new Vector(Z.x,Z.y,T.U[i].x[2]);
	}
	return T2;
    }
}

