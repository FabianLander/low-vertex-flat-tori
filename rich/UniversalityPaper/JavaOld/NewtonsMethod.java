import java.awt.event.*;
import java.awt.*;

public class NewtonsMethod {


    public static Vector[] doNewton(Vector[] V,int k) {
	for(int i=0;i<k;++i) {
	    V=oneStepNewton(V,0.0000000001);
	}
	return V;
    }

    /**This is the main step in Newton's method*/

    public static Vector[] oneStepNewton(Vector[] V,double epsilon) {
	Matrix m=turnDiffSymm(V,epsilon);
	m=m.inverse();
	m=m.transpose();
	double[] d=turn3(V);
	Vector v=new Vector(d);
	Vector w=Matrix.act(m,v);
	Vector[] V2=new Vector[8];

	//copy vector
	for(int i=0;i<8;++i) {
	    V2[i]=new Vector(V[i]);
	}

	//make variation according to Newton's method
	int[] g={7,6,5};
	for(int i=0;i<3;++i) {
	    int i2=g[i];
	    V2[i].x[2]=V[i].x[2]-w.x[i];
	    V2[i2].x[2]=V[i2].x[2]-w.x[i];
	}
	return V2;
    }
    
    /**This gets a square matrix, which computes how the angles
       depend on the variation of the qth coords of the first 8 points*/

    public static Matrix turnDiffSymm(Vector[] V,double epsilon) {
	double[][] d=turnDiff(V,epsilon);
	Matrix m=new Matrix();
	int[] g={7,6,5};
	for(int i=0;i<3;++i) {
	    for(int j=0;j<3;++j) {
		int i2=g[i];
		m.a[i][j]=d[i][j]+d[i2][j];
	    }
	}
	return m;
    }

    
    
    public static double[][] turnDiff(Vector[] V,double epsilon) {
	int count=0;
	double[][] m=new double[8][3];
	for(int a=0;a<8;++a) {
  	    m[count]=turnDiff(V,a,epsilon);
	    ++count;
	}
	return m;
    }
		
    /**takes the numerical derivative.  for high precision epsilon should be very small.*/
    
    public static double[] turnDiff(Vector[] V0,int a,double epsilon) {
   	Vector[] V1=perturb(V0,a,epsilon);
       	double[] d0=turn3(V0);
	double[] d1=turn3(V1);
	double[] diff=new double[3];
	for(int i=0;i<3;++i) {
	    diff[i]=(d1[i]-d0[i])/epsilon;
	}
	return diff;
    }



    

    /**this does the variation in the desired direction*/

    public static Vector[] perturb(Vector[] V,int a,double epsilon) {
	Vector[] V2=new Vector[8];
	for(int i=0;i<8;++i) {
	    V2[i]=new Vector(V[i]);
	}
	V2[a].x[2]=V[a].x[2]+epsilon;
	return V2;
    }




    

    public static double[] turn3(Vector[] V) {
	double[] d=new double[3];
   	for(int i=0;i<3;++i) {
  	    d[i]=turnRaw(i,V);
	    d[i]=d[i]-2*Math.PI;
	}
	return d;
    }

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
	return a;
     }
    
    public static double angle(Vector[] V) {
	Vector V1=Vector.minus(V[1],V[0]);
	Vector V2=Vector.minus(V[2],V[0]);
	V1=V1.unit();
	V2=V2.unit();
	double r=Vector.dot(V1,V2);
	return Math.acos(r);
    }

    
}



