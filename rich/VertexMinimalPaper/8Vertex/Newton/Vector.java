import java.awt.event.*;
import java.awt.*;

/*This class does the basic arithmetic
  of vectors. We don't use this class
in our calculations but we keep the file
around to shadow the BigDecimal version*/


public class Vector {
    double[] x=new double[3];
    
    public Vector(){}

    
    public Vector(double xx,double yy,double zz) {
	x[0]=xx;
	x[1]=yy;
	x[2]=zz;
    }

    public Vector(double[] t) {
	x[0]=t[0];
	x[1]=t[1];
	x[2]=t[2];
    }

    public Vector(Vector X) {
	x[0]=X.x[0];
	x[1]=X.x[1];
	x[2]=X.x[2];
    }


    
    public Vector scale(double t) {
	Vector a=new Vector(t*x[0],t*x[1],t*x[2]);
	return a;
    }

    public static double  dot(Vector v,Vector w) {
	return(v.x[0]*w.x[0]+v.x[1]*w.x[1]+v.x[2]*w.x[2]);
    }

    public static Vector plus(Vector V,Vector W) {
	return(new Vector(V.x[0]+W.x[0],V.x[1]+W.x[1],V.x[2]+W.x[2]));
    }

    public static Vector minus(Vector V,Vector W) {
	return(new Vector(V.x[0]-W.x[0],V.x[1]-W.x[1],V.x[2]-W.x[2]));
    }

    public static Vector cross(Vector v,Vector w) {
	Vector X=new Vector();
	X.x[0]=v.x[1]*w.x[2]-w.x[1]*v.x[2];
	X.x[1]=v.x[2]*w.x[0]-w.x[2]*v.x[0];
	X.x[2]=v.x[0]*w.x[1]-w.x[0]*v.x[1];
	return(X);
    }

    public void print() {
	System.out.println(x[0]+" "+x[1]+" "+x[2]);
    }

}




