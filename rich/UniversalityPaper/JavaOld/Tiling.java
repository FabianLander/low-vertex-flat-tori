import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;
import java.util.Arrays;

/**This stores the triangles around the link of
   a triangulation*/

public class Tiling {
    Complex[][] Z=new Complex[7][3];
    double[][] fol=new double[7][3];   //this is experimental: for the level set foliations
    int[][] LINK=new int[6][3];
    int size; //number of triangles
    Complex center;
    Complex phase; //this is the rotation




    public static Complex symmetryPoint(Torus T) {
	int[][] F=TriangulationCombinatorics.tiling();
	Complex[][] Z=new Complex[2][3];
	Z[0]=triangle(F[0],T.U);
	int[] list={0,1};
	for(int i=1;i<2;++i) {
	    Z[i]=triangle(F[list[i]],T.U);
	    Z[i]=snapTo(Z[i-1],Z[i]);
	}
	Complex w=Complex.plus(Z[1][1],Z[1][2]);
	w=w.scale(.5);
	return w;
    }


    

    public static Complex intrinsicShape(Torus T) {
	Complex t1=lattice1(T);
	Complex t2=lattice2(T);
	return Complex.divide(t1,t2);
    }
    

    public static Complex lattice1(Torus T) {
	int[][] F=TriangulationCombinatorics.tiling();
	Complex[][] Z=new Complex[7][3];
	Z[0]=triangle(F[0],T.U);
	int[] list={0,1,3,14,9,6,0};
	for(int i=1;i<7;++i) {
	    Z[i]=triangle(F[list[i]],T.U);
	    Z[i]=snapTo(Z[i-1],Z[i]);
	}
	Complex t=Complex.minus(Z[6][0],Z[0][0]);
	return t;
    }



    public static Complex lattice2(Torus T) {
	int[][] F=TriangulationCombinatorics.tiling();
	Complex[][] Z=new Complex[7][3];
	Z[0]=triangle(F[0],T.U);
	int[] list={0,2,10,8,9,6,0};
	for(int i=1;i<7;++i) {
	    Z[i]=triangle(F[list[i]],T.U);
	    Z[i]=snapTo(Z[i-1],Z[i]);
	}
	Complex t=Complex.minus(Z[6][0],Z[0][0]);
	return t;
    }


    public static Complex[] translate(Complex[] Z,Complex t1,Complex t2,int m1,int m2) {
	Complex[] W=new Complex[3];
	Complex t=Complex.plus(t1.scale(m1),t2.scale(m2));
	for(int i=0;i<3;++i) {
	    W[i]=Complex.plus(Z[i],t);
	    W[i].label=Z[i].label;
	}
	return W;
    }


    public static Complex[][] fundamentalDomain(Torus T) {
	int[][] F=TriangulationCombinatorics.tiling();
	Complex[][] Z=new Complex[16][3];
	Z[0]=triangle(F[0],T.U);
	int[] list={0,1,3,14,9,6,11,12,15,13,7,8,10,2,4,5};
	for(int i=1;i<list.length;++i) {
	    Z[i]=triangle(F[list[i]],T.U);
	    Z[i]=snapTo(Z[i-1],Z[i]);
	}
	return Z;
    }
    

    /**triangle snapping:  This routine assumes the the triangles have an edge in common*/

      public static int[] extractLabel(Complex[] Z) {
	int[] f={Z[0].label,Z[1].label,Z[2].label};
	return f;
      }

    public static Complex[] snapTo(Complex[] Z0,Complex[] Z1) {
	int[] f0=extractLabel(Z0);
	int[] f1=extractLabel(Z1);
        int[][] g = ListHelp.reorderCommonFirst(f0,f1);
	Complex z0=getPoint(Z0,g[0][0]);
	Complex z1=getPoint(Z0,g[0][1]);
	Complex w0=getPoint(Z1,g[1][0]);
	Complex w1=getPoint(Z1,g[1][1]);
	Complex u=Complex.divide(Complex.minus(z1,z0),Complex.minus(w1,w0));

	Complex[] Z2=new Complex[3];
	for(int i=0;i<3;++i) {
	    Z2[i]=Complex.times(Z1[i],u);
	    Z2[i].label=Z1[i].label;
	}

	z0=getPoint(Z0,g[0][0]);
	w0=getPoint(Z2,g[1][0]);
	Complex t=Complex.minus(z0,w0);

	Complex[] W=new Complex[3];
	for(int i=0;i<3;++i) {
	    W[i]=Complex.plus(Z2[i],t);
	    W[i].label=Z2[i].label;
	}
	return W;
    }
	

    public static Complex getPoint(Complex[] Z,int l) {
	for(int i=0;i<3;++i) {
	    if(Z[i].label==l) return Z[i];
	}
	return null;
    }

    

    /**triangle creation*/

    public static Complex[] triangle(int[] f,Vector[] V) {
	Complex[] Z = SSAtoTri(SSA(f,V));
	for(int i=0;i<3;++i) Z[i].label=f[i];
	return Z;
    }
    
    public static Complex[] SSAtoTri(double[] d) {
	Complex z0=new Complex(0,0);
	Complex z1=new Complex(d[0],0);
	double x=d[1]*Math.cos(d[2]);
	double y=d[1]*Math.sin(d[2]);
	Complex z2=new Complex(x,y);
	Complex[] Z={z0,z1,z2};
	return Z;
    }
    
    public static double[] SSA(int[] f,Vector[] V) {
	Vector A=Vector.minus(V[f[1]],V[f[0]]);
	Vector B=Vector.minus(V[f[2]],V[f[0]]);
	Vector UA=A.unit();
	Vector UB=B.unit();
	double a=Vector.dot(UA,UB);
	a=Math.acos(a);
	double[] d={A.norm(),B.norm(),a};
	return d;
    }

    /**end triangle creation*/


    public static double[] assignWeights(Matrix m,Torus T,int[] f) {
	Vector V=new Vector(0,0,1);
	double[] d=new double[3];
	for(int i=0;i<3;++i) d[i]=Vector.dot(Matrix.act(m,T.U[f[i]]),V);
	return d;
    }

    public static Complex baseModulus(Torus T) {
	Vector A=Vector.minus(T.U[0],T.U[2]);
	Vector B=Vector.minus(T.U[0],T.U[6]);
	double An=A.norm();
	double Bn=B.norm();
	A=A.unit();
	B=B.unit();
	double a=Vector.dot(A,B);
	a=Math.acos(a);
	double r=An/Bn;
	
	Complex z=new Complex(-r*Math.cos(a),r*Math.sin(a));
	return z;
    }
    
}
