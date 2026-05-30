import java.awt.geom.*;

public class Triangulation {


    public static Path2D.Double hex(Complex c) {
    	double a0=Math.PI/6;
	Path2D.Double h=new Path2D.Double();
        for (int i = 0; i < 6; ++i) {
	    Complex u=hexVertex(c,i);
            if (i == 0) h.moveTo(u.x, u.y);
            else h.lineTo(u.x, u.y);
        }
        h.closePath();
	return h;
    }

    public static Complex hexVertex(Complex c,int i) {
    	double a0=Math.PI/6;
	Path2D.Double h=new Path2D.Double();
        double a = a0 + Math.PI / 3 * i;
        double x = c.x + Math.cos(a);
        double y = c.y + Math.sin(a);
	return new Complex(x,y);
    }


    public static Complex point(double a1,double a2) {
	Complex z1=new Complex(1,0);
	double s=Math.sqrt(3);
        double a = 2*Math.PI / 3;
        double x = Math.cos(a);
        double y = Math.sin(a);
	Complex z2=new Complex(x,y);
	Complex w=Complex.plus(z1.scale(s*a1),z2.scale(s*a2));
	return w;
    }


}
