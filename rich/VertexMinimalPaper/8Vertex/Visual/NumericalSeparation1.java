import java.awt.event.*;
import java.awt.*;


public class NumericalSeparation1 {


    public static Vector winner(int k,double tol) {
	int K=300;



	
	for(int i=-K;i<=K;++i) {
	    for(int j=-K;j<=K;++j) {
		Vector L0=new Vector(K,i,j);
		Vector L1=new Vector(i,K,j);
		Vector L2=new Vector(i,j,K);
		if(separatorWorks(k,L0,K*tol)==true) return L0;
		if(separatorWorks(k,L1,K*tol)==true) return L1;
		if(separatorWorks(k,L2,K*tol)==true) return L2;
	    }
	}
	return null;
    }
    /*k in 0,...,23 names triangle pair
      n names which pseudorandom vector
      tol>=0 is a separation tolerance.  bigger means more separated*/

    
    public static boolean separatorWorks(int k,Vector L,double tol) {
	double[][] d=LF(k,L);
	double min0=Math.min(d[0][0],d[0][1]);
	double max0=Math.max(d[0][0],d[0][1]);
	double min1=Math.min(d[1][0],d[1][1]);
	double max1=Math.max(d[1][0],d[1][1]);
	double x=d[0][2];
	if((max0<x-tol)&&(x<min1-tol)) return true;
	if((max1<x-tol)&&(x<min0-tol)) return true;
	return false;
    }


    public static double[][] LF(int k,Vector L) {
	double[] d0={100000000,-100000000,0};
	double[] d1={100000000,-100000000,0};
	Vector[] T0=triangle(k,0);
	Vector[] T1=triangle(k,1);

	//ignores 0th index because it is the common vertex
	for(int i=1;i<3;++i) {
	    double test=Vector.dot(L,T0[i]);
	    if(d0[0]>test) d0[0]=test;
	    if(d0[1]<test) d0[1]=test;
	}

	//now we test the common vertex
	d0[2]=Vector.dot(L,T0[0]);
	d1[2]=Vector.dot(L,T1[0]);
	
	//ignores 0th index because it is the common vertex
	for(int i=1;i<3;++i) {
	    double test=Vector.dot(L,T1[i]);
	    if(d1[0]>test) d1[0]=test;
	    if(d1[1]<test) d1[1]=test;
	}

	double[][] d={d0,d1};
	return d;
    }


    public static Vector randomClean() {
	double[] d=new double[3];
	double max=0;
	for(int i=0;i<3;++i) {
	    d[i]=2*Math.random()-1;
	    if(max<Math.abs(d[i])) max=Math.abs(d[i]);
	}
	for(int i=0;i<3;++i) {
	    d[i]=d[i]/max;
	    d[i]=Math.floor(d[i]*300);
	}

	Vector V=new Vector(d[0],d[1],d[2]);
	return V;
	}

    
    


    public static Vector[] triangle(int k,int q) {
	int[][][] D1=TriangulationCombinatorics.D1();
	Torus T=PaperTorus.shape();
	int[][] E0=D1[k];
	int[] f=E0[q];
	Vector[] A={T.U[f[0]],T.U[f[1]],T.U[f[2]]};
	return A;
    }

    
}



