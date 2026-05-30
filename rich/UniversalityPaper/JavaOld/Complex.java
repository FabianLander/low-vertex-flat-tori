import java.awt.event.*;
import java.awt.*;

/*This class does the basic arithmetic of complex numbers */

public class Complex {
    double x,y;
    int label;
    int[] edge=new int[2];
    int tri;
    
    public Complex() {
        this.x=0.0;
        this.y=0.0;
    } 
    
    public Complex(double x,double y) {
        this.x=x;
        this.y=y;
    }
    
    public Complex(Complex z) {
        this.x=z.x;
        this.y=z.y;
	this.label=z.label;
	this.edge[0]=z.edge[0];
	this.edge[1]=z.edge[1];
    }

    public static Complex random() {
	double x=Math.random();
	double y=Math.random();
	x=2*x-1;
	y=2*y-1;
	return new Complex(x,y);
    }


    public static Complex plus(Complex z1,Complex z2) {
        return new Complex(z1.x+z2.x, z1.y+z2.y);
    }

    public static Complex minus(Complex z1,Complex z2) {
        return new Complex(z1.x-z2.x, z1.y-z2.y);
    }
    

    public static Complex times(Complex z1,Complex z2) {
        return new Complex(z1.x*z2.x-z1.y*z2.y,
        z1.x*z2.y+z1.y*z2.x);
    }

    public static Complex divide(Complex z1,Complex z2) {
        return times(z1,z2.inverse());
    }
    
    public static Complex conjugate(Complex z) {
        Complex w=new Complex(z.x,-z.y);
	w.label=z.label;
	return w;
    }
    
    public double norm() {
        return Math.sqrt(x*x+y*y);
    }

    public static double dist(Complex a,Complex b) {
	Complex c=minus(a,b);
	return c.norm();
    }

    
    public double norm2() {
        return x*x+y*y;
    }

    public Complex unit() {
        double d=norm();
        return new Complex(x/d,y/d);
    }

    public Complex inverse() {
        double d=x*x+y*y;
        return new Complex(x/d,-y/d);
    }
    
    public Complex conjugate() {
        return new Complex(x,-y);
    }
    
    public double arg(){
        return Math.atan2(y,x);
    }

    public Complex scale(double r) {
	return new Complex(r*x,r*y);
    }

    public static boolean isPositivelyOriented(Complex[] z) {
	return isPositivelyOriented(z[0],z[1],z[2]);
    }
    
    public static boolean  isPositivelyOriented(Complex z1,Complex z2,Complex z3) {
  	double y=signedArea(z1,z2,z3);
	if(y<0) return true;
	return false;
    }

    public static double absArea(Complex[] z) {
	double a=signedArea(z);
        return Math.abs(a);
    }

    public static double signedArea(Complex[] z) {
	return signedArea(z[0],z[1],z[2]);
    }

    public static double signedArea(Complex z1,Complex z2,Complex z3) {
        Complex[] z=new Complex[5];
        for(int i=1;i<=4;++i) z[i]=new Complex();
        z[1]=Complex.minus(z2,z1);
        z[2]=Complex.minus(z3,z1);
        z[3]=Complex.conjugate(z[2]);
        z[4]=Complex.times(z[1],z[3]);
	return z[4].y;
    }

    public static boolean containsWide(Complex[] Z,Complex w,double tol) {
	double a0=signedArea(Z[0],Z[1],Z[2]);
	for(int i=0;i<3;++i) {
	    int j=(i+1)%3;
	    int k=(i+2)%3;
	    double a1=signedArea(w,Z[j],Z[k]);
	    if((a0>=0)&&(a1<-tol)) return false;
	    if((a0<=0)&&(a1>+tol)) return false;
	}
	return true;
    }

    public static int[] whichSide(Complex[] Z,Complex w) {
	int count=0;
	int[] s={0,0,0};

	for(int i=0;i<3;++i) {
	    int j=(i+1)%3;
	    int k=(i+2)%3;
	    double a0=signedArea(Z[i],Z[j],Z[k]);
	    double a1=signedArea(w,Z[j],Z[k]);
	    if(a0*a1<0) {
		s[i]=1;
		++count;
	    }
	}
	
	if(count==0) {
	    int[] A={0,0};
	    return A;
	}
	
	if(count==1) {
	    int[] A={1,-1};
	    for(int i=0;i<3;++i) {
		if(s[i]==1) A[1]=i;
	    }
	    return A;
	}

	if(count==2) {
	    int[] A={2,-1};
	    for(int i=0;i<3;++i) {
		if(s[i]==0) A[1]=i;
	    }
	    return A;
	}
	return null;

    }

    

    public void print() {
	System.out.println("Complex: "+this.x+" "+this.y);
    }
    public void print1() {
	System.out.println("Complex: "+this.x+" "+this.y);
	System.out.println("label "+label);
    }
    
    public boolean isNaN() {
       return Double.isNaN(this.x) || Double.isNaN(this.y);
    }

}

