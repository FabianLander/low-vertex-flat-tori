import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;
import java.util.Arrays;



public class Torus {
    Vector[] U=new Vector[8];
    
    public Torus() {}

    public Torus(Torus T) {
	for(int i=0;i<8;++i) U[i]=new Vector(T.U[i]);
    }


    public static Torus toDouble(TorusBig T0) {
	Torus T=new Torus();
	for(int i=0;i<8;++i) {
	    T.U[i]=new Vector();
	    for(int j=0;j<3;++j) {
		T.U[i].x[j]=T0.U[i].x[j].doubleValue();
	    }
	}
	return T;
    }

    /**Torus geometry tests*/

    /**gets the min and max coords*/

    public double[] extrema(int k) {
	double min=10000;
	double max=-10000;
	for(int i=0;i<8;++i) {
	    if(min>U[i].x[k]) min=U[i].x[k];
	    if(max<U[i].x[k]) max=U[i].x[k];
	}
	double[] a={min,max};
	return a;
    }

    /**checks minimum dihedral angles*/


    /**min and max vertex distances*/
    
    public double minDist() {
	double min=100;
	for(int i=0;i<8;++i) {
	    for(int j=i+1;j<8;++j) {
		double test=Vector.dist(U[i],U[j]);
		if(test<min) min=test;
	    }
	}
	return min;
    }

    public double maxDist() {
	double max=0;
	for(int i=0;i<8;++i) {
	    for(int j=i+1;j<8;++j) {
		double test=Vector.dist(U[i],U[j]);
		if(test>max) max=test;
	    }
	}
	return max;
    }





    
    /**important routine: checks flatness*/
    
    public double flatness() {
  	double[] d=turn();
	double s=0;
	for(int i=0;i<8;++i) {
	    double t=Math.abs(d[i]);
	    if(s<t) s=t;
	}
	return s;
    }

    /**This is normalized so that the sum of the angles is 0*/
    
    public double[] turn() {
	double[] d=new double[8];
   	for(int i=0;i<8;++i) {
    	    d[i]=turnRaw(i,U);
	    d[i]=d[i]-1;
	}
	return d;
    }

    /**gets the angle divided by 2Pi*/
    public static double turnRaw(int link,Vector[] V) {
          int[] cyc=TriangulationCombinatorics.edgeLink(link);
	double a=0;
	for(int i=0;i<cyc.length;++i) {
	    int j=(i+1)%cyc.length;
	    Vector v0=V[link];
	    Vector v1=V[cyc[i]];
	    Vector v2=V[cyc[j]];
	    Vector[] TRI={v0,v1,v2};
	    a=a+angle(TRI);
	}
	return a/(2*Math.PI);
    }

    public static double angle(Vector[] V) {
	Vector V1=Vector.minus(V[1],V[0]);
	Vector V2=Vector.minus(V[2],V[0]);
	V1=V1.unit();
	V2=V2.unit();
	double r=Vector.dot(V1,V2);
	return Math.acos(r);
    }
    

    /**important routing checks embedding. The larger tol,
       the more robust a true answer is.*/

    public void print() {			     
	System.out.println("---------------------------");
	System.out.print("{");
	for(int i=0;i<8;++i) {
	    U[i].print2();
	    if(i<7) System.out.println(",");
	}
	System.out.println("};");
    }

}
   
