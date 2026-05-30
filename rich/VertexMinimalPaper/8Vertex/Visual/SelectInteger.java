import java.awt.event.*;
import java.awt.*;


public class SelectInteger {
    public ListenTriangle up,down;
    public int x,y,w,h;
    public int min,max,step,val;
    public String S;


    public SelectInteger(int x,int y,int w,int h,int val,int min,int max,int step) {
    this.x=x;
    this.y=y;
    this.w=w;
    this.h=h;
    this.val=val;
    this.min=min;
    this.max=max;
    this.step=step;
    S="";

    down=new ListenTriangle();
    down.z[0]=new Complex(x+w/2-2,y);
    down.z[1]=new Complex(x,y+h/2);
    down.z[2]=new Complex(x+w/2-2,y+h);
   

    up=new ListenTriangle();
    up.z[0]=new Complex(x+w/2+2,y);
    up.z[1]=new Complex(x+w,y+h/2);
    up.z[2]=new Complex(x+w/2+2,y+h);
    }


    public void modify(Point X) {
	if(down.inside(X)==1) val=val-step;
	if(up.inside(X)==1) val=val+step;
	if(val<min) val=val+step;
	if(val>max) val=val-step;
    }


    public int upOrDown(Point X) {
	if(down.inside(X)==1) return(-1);
	if(up.inside(X)==1) return(1);
	return(0);
    }





    public int isModified(Point X) {
	if(down.inside(X)==1) return(1);
	if(up.inside(X)==1) return(1);
	return(0);
    }





    public void modifyCyclic(Point X) {
	if(down.inside(X)==1) 	val=(val-step+max)%max;
	if(up.inside(X)==1) 	val=(val+step)%max;
    }


    public void render(Graphics g,Color C1,Color C2,Color C3) {
    up.render(g,C1,C2);
    down.render(g,C1,C2);  
    g.setFont(new Font("Helvetica",Font.PLAIN,11));
    g.setColor(C3);
    Integer I=Integer.valueOf(val);
    g.drawString(I.toString(),x+w+8,y+h/2+4);
    g.drawString(S,x-1,y+h+12);
    }

    public void render2(Graphics g,Color C1,Color C2,Color C3) {
    up.render(g,C1,C2);
    down.render(g,C1,C2);  
    g.setFont(new Font("Helvetica",Font.PLAIN,11));
    g.setColor(C3);
    int val2=(int)(Math.pow(2,val));
    Integer I=Integer.valueOf(val2);
    g.drawString(I.toString(),x+w+6,y+h/2+4);
    g.drawString(S,x-1,y+h+12);
    }



    public void render3(Graphics g,Color C1,Color C2,Color C3) {
    up.render(g,C1,C2);
    down.render(g,C1,C2);  
    g.setFont(new Font("Helvetica",Font.PLAIN,11));
    g.setColor(C3);
    Integer I=Integer.valueOf(val);
    g.drawString(I.toString(),x+w+2,y+h/2+4);
    g.drawString(S,x-1,y+h+12);
    }







public class ListenTriangle {
    public Complex[] z=new Complex[3];
    public int history;
    
    /** Construct a ListenTriangle where all the vertices are the origin */
    public ListenTriangle() {
        z[0]=new Complex();
        z[1]=new Complex();
        z[2]=new Complex();
    }

    public ListenTriangle(Complex a, Complex b, Complex c) {
        z[0]=new Complex(a);
        z[1]=new Complex(b);
        z[2]=new Complex(c);
    }

    public ListenTriangle(ListenTriangle T) {
        z[0]=new Complex(T.z[0]);
        z[1]=new Complex(T.z[1]);
        z[2]=new Complex(T.z[2]);
    }
    
    /**tells if a point is in the triangle*/
    public int inside(Point p) {
        int i,j,k,G1,G2;
        double x0,x1,x2,y0,y1,y2;
        double test;
        G1=0;
        G2=0;
        
        for(i=0;i<=2;++i) {
            x0=p.x;
            y0=p.y;
            j=i;
            k=i+1;
            if(j>=3) j=j-3;
            if(k>=3) k=k-3;
            x1=z[i].x;
            y1=z[j].y;
            x2=z[k].x;
            y2=z[k].y;
            test=x0*y1+x1*y2+x2*y0-y0*x1-y1*x2-y2*x0;
            if(test>0) G2=1;
            if(test<=0) G2=-1;
            if((G1!=0)&&(G1!=G2)) return(0);
            G1=G2;
        }
        return(1);
    }
    
    
    /**draws the triangle */
    
    public void render(Graphics g,Color C1,Color C2) {
        Polygon P=new Polygon();
        int X1[]={(int)(z[0].x),(int)(z[1].x),(int)(z[2].x)};
        int Y1[]={(int)(z[0].y),(int)(z[1].y),(int)(z[2].y)};
        P.xpoints=X1;
        P.ypoints=Y1;
        P.npoints=3;
        g.setColor(C1);
        g.fillPolygon(P);
        g.setColor(C2);
        g.drawPolygon(P);
    }
}




}
