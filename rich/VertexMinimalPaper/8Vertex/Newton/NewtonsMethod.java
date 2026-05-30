import java.awt.event.*;
import java.awt.*;

public class NewtonsMethod {

    /**This is the starting seed for Newton's method.
    We don't use this class in our calcultions.  We keep
    the file here to shadow our high precision version*/
    

    public static Vector[] seed() {
	double z0= 0.454;
	double z1= 0.469;
	double z2= 0.449;
	
	double[][] d=
	    {{ 0.756,  0.648, z0},
	     {-0.453,  0.343, z1},
	     {-0.171,  1.141, z2},
	     { 0.453, -0.343, z1},
             {-0.756, -0.648, z0},
             {-0.089,  0.662, -0.531},
             { 0.171, -1.141, z2},
             { 0.089, -0.662, -0.531}};
	Vector[] V=new Vector[8];
	
	for(int i=0;i<8;++i) V[i]=new Vector(d[i]);
    return V;
    }


    /**This does Newton's method for k steps*/
    
    public static Vector[] doNewton(int k) {
	Vector[] V=seed();
	for(int i=0;i<k;++i) {
	    V=oneStepNewton(V,0.00000000000001);
	}
	return V;
    }


    /**This is the main step in Newton's method*/

    public static Vector[] oneStepNewton(Vector[] V,double epsilon) {
	Matrix m=turnDiffSymm(V,epsilon);
	m=m.inverse();
	double[] d=turn3(V);
	Vector v=new Vector(d);
	Vector w=Matrix.act(m,v);
	Vector[] V2=new Vector[8];

	//copy vector
	for(int i=0;i<8;++i) {
	    V2[i]=new Vector(V[i]);
	}

	//make variation according to Newton's method
	int[] g={4,3,6};
	for(int i=0;i<3;++i) {
	    int i2=g[i];
	    V2[i].x[2]=V[i].x[2]-w.x[i];
	    V2[i2].x[2]=V[i2].x[2]-w.x[i];
	}
	return V2;
    }


    /**This gets a square matrix, which computes how the angles
       depend on the variation of the qth coords of the first 7 points*/

    public static Matrix turnDiffSymm(Vector[] V,double epsilon) {
	double[][] d=turnDiff(V,epsilon);
	Matrix m=new Matrix();
	int[] g={4,3,6};
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
	double[][] m=new double[7][3];
	for(int a=0;a<7;++a) {
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
	    d[i]=d[i]/(2*Math.PI);
	    d[i]=d[i]-1;
	}
	return d;
    }

    public static double turnRaw(int link,Vector[] V) {
        int[] cyc=edgeLink(link);
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
	double r=Vector.dot(V1,V2)/Math.sqrt(Vector.dot(V1,V1)*Vector.dot(V2,V2));
	return Math.acos(r);
    }

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

    
}



