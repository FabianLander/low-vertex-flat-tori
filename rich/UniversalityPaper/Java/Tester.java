import java.awt.event.*;
import java.awt.*;

/**This prints out data related to the paper torus*/

public class Tester {

    public static void main(Manager M) {
	int m=M.C.ACTION.mode;
	if(m==0) printTorus(M);
	if(m==1) printGeometry(M);
	if(m==2) printMatrix(M);
    }

    public static Torus getTorus(Manager M) {
	Torus T=M.C.getTorus();
	return T;
    }



    public static void printTorus(Manager M) {
	System.out.println("================================================");
	printExtrinsic(M);
	printIntrinsic(M);
	System.out.println("================================================");
    }

    

    
    public static void printExtrinsic(Manager M) {
	System.out.println("--------TORUS VERTICES----------");
	Torus T=getTorus(M);
	for(int i=0;i<8;++i) {
	    System.out.print("(" +i+") ");  T.U[i].print();
	}
	System.out.println("--------------------------");
   	boolean test=TriangleChecker.embedded(T);
 	System.out.println("EMBEDDED: "+test);
	double f=T.flatness();
	
	System.out.println("FLATNESS: "+f);
	System.out.println("--------------------------");
	double tol=Math.pow(10,-15);
	if(f<tol/10) f=tol/10;
	String S="";
	if(test==true) S="embedded";
	if(test==false) S="not embedded";
	double ff=Math.log(f)/Math.log(10);
	ff=Math.floor(ff)+1;
	Integer F=Integer.valueOf((int)(ff));
	S=S+" "+F.toString();
	M.C.MESSAGE=S;
    }

    public static void printIntrinsic(Manager M) {
    	Torus T=getTorus(M);
	Complex t1=Tiling.lattice1(T);
	Complex t2=Tiling.lattice2(T);
  	Complex[] W={t1,t2};
	System.out.println("-----LATTICE--------");
	W[0].print();
	W[1].print();
	Complex w=Tiling.intrinsicShape(T);
	System.out.println("MODULAR PARAMETER");
	w.print();
    }
    


    public static void printMatrix(Manager M) {
	System.out.println("--------JACOBIAN----------");
	for(int k=11;k<12;++k) {
	    System.out.println("=====");
	    System.out.println("=====");
	    System.out.println("difference quotient 10^-"+k);
	    double epsilon=Math.pow(10,-k);
   	    Torus T=getTorus(M);
	    Matrix m=NewtonsMethod.turnDiffSymm(T.U,epsilon);
	    m.print();
	    System.out.println("");
	    m=m.inverse();
	    System.out.println("inverse");
	    m.print();
	    System.out.println("=====");
	    System.out.println("=====");
	}
    }


    public static void printGeometry(Manager M) {
	System.out.println("---------geometric estimates----------");
	printAreaBound1(M);
	printAreaBound2(M);
	printEdgeBounds(M);
	System.out.println("----------------------------");
    }
    
    
    public static void printAreaBound2(Manager M) {
     	Torus T=getTorus(M);
	double min=100;
	double max=-100;
	int[][] f=TriangulationCombinatorics.tiling();

	for(int k=0;k<3;++k) {
	for(int i=0;i<f.length;++i) {
	    int i0=k;
	    int i1=(k+1)%3;
	    int i2=(k+2)%3;
	    
	    Vector A=T.U[f[i][i0]];
	    Vector B=T.U[f[i][i1]];
	    Vector C=T.U[f[i][i2]];
	    Vector BB=Vector.minus(B,A);
	    Vector CC=Vector.minus(C,A);
	    Vector DD=Vector.cross(BB,CC);
	    double test=DD.norm();
	    if(min>test) min=test;
	    if(max<test) max=test;
	}
	}
	System.out.println("3D area lower bound "+min);
	System.out.println("3D area upper bound "+max);
    }


    
    public static void printAreaBound1(Manager M) {
     	Torus T=getTorus(M);
	double min=100;
	double max=-100;
	int[][] f=TriangulationCombinatorics.tiling();

	for(int k=0;k<3;++k) {
	for(int i=0;i<f.length;++i) {
	    int i0=k;
	    int i1=(k+1)%3;
	    int i2=(k+2)%3;
	    
	    Vector A=T.U[f[i][i0]];
	    Vector B=T.U[f[i][i1]];
	    Vector C=T.U[f[i][i2]];
	    Vector BB=Vector.minus(B,A);
	    Vector CC=Vector.minus(C,A);
	    BB.x[2]=0;
	    CC.x[2]=0;
	    Vector DD=Vector.cross(BB,CC);
	    double test=DD.norm();
	    if(min>test) min=test;
	    if(max<test) max=test;
	}
	}
	System.out.println("2D area lower bound "+min);
	System.out.println("2D area upper bound "+max);
    }

    
    public static void printEdgeBounds(Manager M) {
     	Torus T=getTorus(M);
	double min=100;
	double max=-100;
	int[][] f=TriangulationCombinatorics.tiling();

	for(int k=0;k<3;++k) {
	for(int i=0;i<f.length;++i) {
	    int i0=k;
	    int i1=(k+1)%3;
	    int i2=(k+2)%3;
	    
	    Vector A=T.U[f[i][i0]];
	    Vector B=T.U[f[i][i1]];
	    Vector C=T.U[f[i][i2]];
	    Vector BB=Vector.minus(B,A);
	    Vector CC=Vector.minus(C,A);
	    BB.x[2]=0;
	    CC.x[2]=0;
	    double test=Vector.dist(BB,CC);
	    if(test<min) min=test;
	    if(test>max) max=test;
	}
	}
	System.out.println("edge length lower bound "+min);
	System.out.println("edge length upper bound "+max);
    }



	public static Vector normal(Torus T,int[] f) {
	    Vector[] V={T.U[f[0]],T.U[f[1]],T.U[f[2]]};
	    Vector W20=Vector.minus(V[2],V[0]);
	    Vector W10=Vector.minus(V[1],V[0]);
	    Vector n=Vector.cross(W20,W10);
	    return n;
	}


    

    
}



    
