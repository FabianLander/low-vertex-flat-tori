import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;
import java.util.Arrays;


public class Evolver implements Runnable {
    Manager M;
    boolean halt;

    public Evolver() {}

    public Evolver(Manager MM) {
	this.M=MM;
	halt=true;
    }

    public void run() {
	if(M.C.THREAD.mode==0) run0();
	if(M.C.THREAD.mode==1) run1();
	if(M.C.THREAD.mode==2) run2();
    }
    

    public void run0() {
	halt=false;
	double s=0;
	double[] b={0,0};
	Torus T=M.C.getTorus();
       	try {
	    s=M.T.slice;
 	    b=M.E.getLevelBounds(T);
      	}
	
      	catch(Exception e) {
       	    System.out.println(M.C.MESSAGE="Open slicer, intrinsic geometry, and eye windows.");
       	    M.C.repaint();
       	    halt=true;
      	}

	int sign=1;
	while(halt==false) {
	    double ss=getSpeed();
	    b=M.E.getLevelBounds(T);
	    s=M.T.slice;
	    if((s<b[1])&&(sign==1)) s=s+ss;
	    if((s>=b[1])&&(sign==1)) sign=-sign;
	    if((s>b[0])&&(sign==-1)) s=s-ss;
	    if((s<=b[0])&&(sign==-1)) sign=-sign;
	    M.T.slice=s;
	    M.repaint();
	}
    }

    public double getSpeed() {
	int k=M.C.SPEED.val;
	double d=Math.pow(.5,14+k/2);
	return d;
    }








    
    public void run1() {
	halt=false;
	if((M.newtonCanvasAlive()==false)||(M.platinumCanvasAlive()==false)) {
	    M.C.MESSAGE="open Newton and golden windows";
	    M.C.repaint();
	    halt=true;
	    return;
	}
	
	int freeze=M.N.FREEZE.val;
	int[][] PAIRS=BlockData.dataCompressed();
	int[][] LOOKUP=BlockData.lookup();
	
	halt=false;
  	Torus T=PaperTorus.shape();
	Complex z=M.X.SOURCE;
	Torus TT=PaperTorus.diamond(z);
	T=PaperTorus.align(freeze,TT,T);
	
	while(halt==false) {
   	    Torus T2=perturb(freeze,T,z);
	    double d=PaperTorus.diamondQuality(T,z);
	    double d2=PaperTorus.diamondQuality(T2,z);
	    boolean em=TriangleChecker.embedded(T2,PAIRS,LOOKUP);
	    double fl=T2.flatness();
	    
	    if((d2<d)&&(em==true)&&(fl<Math.pow(10,-15))) {
		M.N.T[1]=T2;
		T=copy(T2);
		pasteData(T2,z);
		M.repaint();
	    }
	}
    }
    
    public Torus perturb(int freeze,Torus T,Complex z) {
	double q=PaperTorus.diamondQuality(T,z);
  	double u=.003*q;
	Complex[] Z=PaperTorus.fromTorus(T);
	
	for(int i=0;i<4;++i) {
 	    Complex zz=Complex.random();
	    if(i!=freeze) Z[i]=Complex.plus(Z[i],zz.scale(u));
	}
	Torus T2=PaperTorus.toTorus(Z);

	double test=T2.flatness();
	
	return T2;
    }


    public static double random() {
	double r=Math.random();
	return 2*r-1;
    }

    public void pasteData(Torus T,Complex z) {
	Complex[] Z=PaperTorus.fromTorus(T);
      	Complex[] ZZ=PaperTorus.fromTorus(PaperTorus.diamond(z));
	
	for(int i=0;i<4;++i) Z[i]=Complex.minus(Z[i],ZZ[i]);
	double a=Z[0].x;
 	double q=PaperTorus.diamondQuality(T,z);
	System.out.println("========================================================== "+q);
	double[] diff={Z[0].x,Z[1].x,Z[2].x,Z[3].x,Z[0].y,Z[1].y,Z[2].y,Z[3].y};
	for(int i=0;i<8;++i) printNice(i,diff[i]);
	System.out.println(diff[2]/diff[0]);
	Complex zz=Tiling.intrinsicShape(T);
	System.out.println("----------");
	zz.print();
	System.out.println("----------");

    }
    public Torus copy(Torus T) {
	Torus T2=new Torus();
	for(int i=0;i<8;++i) T2.U[i]=new Vector(T.U[i]);
	return T2;
    }

    public void printNice(int i,double d) {
	System.out.print(i+"  ");
	if(Math.abs(d)<Math.pow(10,-15)) {
	    System.out.println("               0");
	    return;
	}	    
	System.out.println(d);
    }








    

    public void run2() {
	halt=false;

	if((M.bundleCanvasAlive()==false)||(M.platinumCanvasAlive()==false)) {
	    M.C.MESSAGE="open triangle bundle and golden windows";
	    M.C.repaint();
	    halt=true;
	    return;
	}

	int PRECISION=300;
	BigDecimal s = BigDecimal.ONE.movePointLeft(100);
  	Complex z=new Complex(M.X.SOURCE);
	BigDecimal x=BigDecimal.valueOf(z.x);
	BigDecimal y=BigDecimal.valueOf(z.y);
	boolean started=false;
	double tol=0.0000000001;
	
	while(halt==false) {

	    if(started==true) {
		BigDecimal[] c=getRandomPoint(M.Z.TRI);
		Complex t=new Complex(c[0].doubleValue(),c[1].doubleValue());
		boolean contain=Complex.containsWide(M.Z.TRI,t,-tol);
		if(contain==false) {
  		    TorusBig T=GoodPath.master(s,x,y,c[0],c[1],PRECISION);
	            boolean test=TriangleCheckerBig.embeddedCompare(T);
		    if(test==true) {
			M.Z.TRI=augment(M.Z.TRI,t,tol);
			M.Z.Z[M.Z.COUNT]=new Complex(t);
			++M.Z.COUNT;
		        M.repaint();
		    }
		}
	    }
	    
	    if(started==false) {
		BigDecimal[] c=getMagicPoint();
	        TorusBig T=GoodPath.master(s,x,y,c[0],c[1],PRECISION);
	        boolean test=TriangleCheckerBig.embedded(T);
		if(test==true) {
		    started=true;
   		    Complex t=new Complex(c[0].doubleValue(),c[1].doubleValue());
		    M.Z.TRI[0]=new Complex(t);
		    M.Z.TRI[1]=new Complex(t);
		    M.Z.TRI[2]=new Complex(t);
		    M.Z.repaint();
		    M.Z.COUNT=1;
		    M.Z.Z[0]=new Complex(t);
		    M.repaint();
		    System.out.println("started");
		}
	    }
	}
	System.out.println("done");
	halt=false;
    }
    
    public BigDecimal[] getMagicPoint() {
	   Complex z=M.Z.magicPoint(M.X.SOURCE.x,M.X.SOURCE.y);
	   BigDecimal c1=BigDecimal.valueOf(z.x);
	   BigDecimal c2=BigDecimal.valueOf(z.y);
	   BigDecimal[] c={c1,c2};
	   return c;
    }
    
    public BigDecimal[] getRandomPoint(Complex[] tri) {
	int n=(int)(20*Math.random());
	double t=Math.pow(.5,n);
	int L=(int)(3*Math.random());
	Complex z=tri[L];
	double r1=Math.random();
	double r2=Math.random();
	r1=2*r1-1;
	r2=2*r2-1;
	r1=z.x+t*r1;
	r2=z.y+t*r2;
	double r0=r1;
	BigDecimal c1=BigDecimal.valueOf(r1);
	BigDecimal c2=BigDecimal.valueOf(r2);
	BigDecimal[] c={c1,c2};
	return c;
    }

    public Complex[] augment(Complex[] Z,Complex w,double tol) {
	double a=Complex.absArea(Z);
	int l=(int)(3*Math.random());
	for(int i=0;i<3;++i) {
	    int ii=(l+i+0)%3;
	    int jj=(l+i+1)%3;
	    int kk=(l+i+2)%3;
	    Complex[] W={Z[jj],Z[kk],w};
	    double b=Complex.absArea(W);
	    if(b>a-tol) return W;
	}
	return Z;
    }
    
    public static Complex intersect(Complex z1, Complex z2,Complex w1, Complex w2) {
      double x1 = z1.x, y1 = z1.y;
      double x2 = z2.x, y2 = z2.y;
      double x3 = w1.x, y3 = w1.y;
      double x4 = w2.x, y4 = w2.y;
      double d = (x1 - x2)*(y3 - y4) - (y1 - y2)*(x3 - x4);
      double px = ((x1*y2 - y1*x2)*(x3 - x4) - (x1 - x2)*(x3*y4 - y3*x4)) / d;
      double py = ((x1*y2 - y1*x2)*(y3 - y4) - (y1 - y2)*(x3*y4 - y3*x4)) / d;
      return new Complex(px, py);
}

    
    
}

