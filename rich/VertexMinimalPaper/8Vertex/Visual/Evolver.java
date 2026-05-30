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

}



