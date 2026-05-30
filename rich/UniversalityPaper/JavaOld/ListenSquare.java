
import java.awt.event.*;
import java.awt.*;
import java.awt.geom.*;

/*This is a basic class for a rectangular button button*/

public class ListenSquare {
    public double x,y,w,h;
    public int on;
    public Color C;


    public ListenSquare () {}

    public ListenSquare(double x,double y,double w,double h,Color C) {
	this.x=x;
	this.y=y;
	this.C=C;
	this.w=w;
	this.h=h;
	this.on=0;
    }

    public ListenSquare(double x,double y,double w,double h) {
	this.x=x;
	this.y=y;
	this.C=Color.black;
	this.w=w;
	this.h=h;
	this.on=1;
    }

    public int inside(Point p) {
        int test=0;
	if((p.x>x)&&(p.x<x+w)&&(p.y>y)&&(p.y<y+h)) test=1;
	return(test);
    }

    /* drawing methods */

    public void render(Graphics g,Color CC) {
	if(on==0) g.setColor(new Color(0,0,0));
	if(on>=1) g.setColor(CC);
	g.fillRect((int)(x),(int)(y),(int)(w),(int)(h));
	g.setColor(C);
	if(on!=0) g.setColor(Color.white);
	g.drawRect((int)(x),(int)(y),(int)(w),(int)(h));
    }

    public void render2(Graphics g,Color CC) {
	if(on==0) g.setColor(new Color(0,0,0));
	if(on>=1) g.setColor(CC);
	g.fillRect((int)(x),(int)(y),(int)(w),(int)(h));
	g.setColor(Color.white);
	g.drawRect((int)(x),(int)(y),(int)(w),(int)(h));
    }

    public void infoRender(Graphics g) {
	g.setColor(new Color(0,0,0));
	g.fillRect((int)(x),(int)(y),(int)(w),(int)(h));
	g.setColor(Color.white);
	g.drawRect((int)(x),(int)(y),(int)(w),(int)(h));
        g.setFont(new Font("Helvetica",Font.PLAIN,10));
	g.drawString("?",(int)(x+4),(int)(y+10));
    }

    //changes the button geometry
    public void render(Graphics2D g,Color C,String S) {
	int yy=(int)(h-4);
	Font f=new Font("Helvetica",Font.PLAIN,yy);
        g.setFont(f);
	FontMetrics fm=g.getFontMetrics(f);
	g.setColor(C);
	w=fm.stringWidth(S)+6;
	g.fillRect((int)(x),(int)(y),(int)(w),(int)(h));
	g.setColor(Color.white);
	int rr=C.getRed();
	int gg=C.getGreen();
	int bb=C.getBlue();
	if(rr+gg+bb>300) g.setColor(Color.black);
	g.drawString(S,(int)(x+3),(int)(y+h-3));
	g.drawRect((int)(x),(int)(y),(int)(w),(int)(h));
    }
    



    /**These routines interact with the enhanced 2D graphics class*/


    public void renderSmooth(Graphics2D g,Color C1,Color C2) {
        Polygon P=new Polygon();
        float X[]={(float)(this.x),(float)(this.x+0),(float)(this.x+this.w),(float)(this.x+this.w)};
        float Y[]={(float)(this.y),(float)(this.y+this.h),(float)(this.y+this.h),(float)(this.y+0)};
	GeneralPath path=new GeneralPath();
	path.moveTo(X[0],Y[0]);
	for(int i=1;i<4;++i) path.lineTo(X[i],Y[i]);
	path.closePath();
	g.setColor(C1);
	g.fill(path);
	g.setColor(C2);
	g.draw(path);
    }

    public void renderSmooth(Graphics2D g) {
        Polygon P=new Polygon();
        float X[]={(float)(this.x),(float)(this.x+0),(float)(this.x+this.w),(float)(this.x+this.w)};
        float Y[]={(float)(this.y),(float)(this.y+this.h),(float)(this.y+this.h),(float)(this.y+0)};
	GeneralPath path=new GeneralPath();
	path.moveTo(X[0],Y[0]);
	for(int i=1;i<4;++i) path.lineTo(X[i],Y[i]);
	path.closePath();
	g.setColor(Color.white);
	g.setStroke(new BasicStroke(3));
	g.draw(path);
	g.setStroke(new BasicStroke(1));
    }




}
