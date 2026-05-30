import java.awt.event.*;
import java.awt.*;

/*This class does the basic arithmetic
  of complex numbers */

public class Complex {
    double x,y;
    
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
    }

    public Complex set(Complex z) {
        x=z.x;
        y=z.y;
        return this;
    }

    public static double norm(Complex z) {
        return Math.sqrt(z.x*z.x+z.y*z.y);
    }

    public static Complex unit(Complex z) {
        double d=z.norm(z);
        return new Complex(z.x/d,z.y/d);
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

    public static Complex inverse(Complex z) {
        double d=z.x*z.x+z.y*z.y;
        return new Complex(z.x/d,-z.y/d);
    }
    

    public static Complex divide(Complex z1,Complex z2) {
        return times(z1,inverse(z2));
    }
    
    public static Complex conjugate(Complex z) {
        return new Complex(z.x,-z.y);
    }
    

    public static double dot(Complex a, Complex b) {
        return a.x*b.x+a.y*b.y;
    }
    
    public static double dist(Complex a,Complex b) {
        Complex z=minus(a,b);
        return(norm(z));
    }
    
    
    
    
    public double norm() {
        return Math.sqrt(x*x+y*y);
    }

    public Complex unit() {
        double d=norm();
        return new Complex(x/d,y/d);
    }

    public Complex plus(Complex z) {
        return new Complex(x+z.x, y+z.y);
    }
    

    public Complex minus(Complex z) {
        return new Complex(x-z.x, y-z.y);
    }

    public Complex times(Complex z) {
        return new Complex(x*z.x-y*z.y,
        x*z.y+y*z.x);
    }
    
    

    public Complex inverse() {
        double d=x*x+y*y;
        return new Complex(x/d,-y/d);
    }
    
    public Complex divide(Complex z2) {
        return times(inverse(z2));
    }
    
    
    public Complex conjugate() {
        return new Complex(x,-y);
    }

    public double dot(Complex a) {
        return a.x*x+a.y*y;
    }
    
    public boolean equals(Complex a) {
        return ((a.x==x)&&(a.y==y));
    }
    
    
    public double arg(){
        return Math.atan2(y,x);
    }

    public Complex scale(double r) {
	return new Complex(r*x,r*y);
    }
    
    public Complex scale(Complex z,double r) {
        Complex w=new Complex();
        w.x=r*x+(1.0-r)*z.x;
        w.y=r*y+(1.0-r)*z.y;
        return(w);
    }

    public void print() {
	System.out.println("Complex: "+this.x+" "+this.y);
    }
}

