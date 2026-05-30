import java.awt.event.*;
import java.awt.*;


public class NumericalSeparation0 {


    /**checks all the vectors on the boundary of a 300x300 cube and waits for one to work.*/

    public static Vector winner(int k,double tol) {
	for(int i=-300;i<=300;++i) {
	    for(int j=-300;j<=300;++j) {
		Vector L0=new Vector(300,i,j);
		Vector L1=new Vector(i,300,j);
		Vector L2=new Vector(i,j,300);
		if(separatorWorks(k,L0,300*tol)==true) return L0;
		if(separatorWorks(k,L1,300*tol)==true) return L1;
		if(separatorWorks(k,L2,300*tol)==true) return L2;
	    }
	}
	return null;
    }



    

    /*k in 0,...,23 names triangle pair
      n names which pseudorandom vector
      tol>=0 is a separation tolerance.  bigger means more separated*/
    

     public static  boolean separatorWorks(int k,Vector L,double tol) {
	double[][] d=LF(k,L);
	if(Math.max(d[0][0],d[0][1])<Math.min(d[1][0],d[1][1])-tol) return true;
	if(Math.min(d[0][0],d[0][1])>Math.max(d[1][0],d[1][1])+tol) return true;
	return false;
    }

    public static double[][] LF(int k,Vector L) {
	double[] d0={100000,-100000};
	double[] d1={100000,-100000};
	Vector[] T0=triangle(k,0); //gets 0th triangle in pair
	Vector[] T1=triangle(k,1); //gets 1st triangle in pair

	//gets min-max dot product interval
	for(int i=0;i<3;++i) {
	    double test=Vector.dot(L,T0[i]);

	    L.print();
	    T0[i].print();
	    System.out.println("debug dot "+test);
	    
	    if(d0[0]>test) d0[0]=test;
	    if(d0[1]<test) d0[1]=test;
	}

	//gets min-max dot product interval
	for(int i=0;i<3;++i) {
	    double test=Vector.dot(L,T1[i]);
	    if(d1[0]>test) d1[0]=test;
	    if(d1[1]<test) d1[1]=test;
	}
	//returns both min-max intervals
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

    

    /**q = 0,1 is the choice of triangle from the pair, either the 0th or the 1st*/
    
    public static Vector[] triangle(int k,int q) {
	int[][][] D0=TriangulationCombinatorics.D0();
      	Torus T=PaperTorus.shape();
      	int[][] E0=D0[k];
	int[] f=E0[q];
	Vector[] A={T.U[f[0]],T.U[f[1]],T.U[f[2]]};
	return A;
    }


    
}



