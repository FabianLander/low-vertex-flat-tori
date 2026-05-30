import java.awt.event.*;
import java.awt.*;

public class HorizontalSlider {
    int x,y,w,h;
    int ACTIVE;
    double POS;
    Color C;
    String S;
    
    HorizontalSlider(int x,int y,int w,int h,double POS,Color C,String s) {
        this.x=x;
        this.y=y;
        this.h=h;
        this.w=w;
        this.POS=POS;
        this.C=C;
	this.S=s;
        ACTIVE=0;
    }

    void render(Graphics g) {
        g.setColor(C);
        g.fillRect(x,y,w,h);
	g.setFont(new Font("Helvetica",Font.PLAIN,15));
	g.setColor(Color.white);
	g.drawString(S,x+5,y+h-5);
	g.setColor(Color.black);
	if(ACTIVE==1) g.setColor(Color.white);
        g.drawRect(x,y,w,h);
        g.setColor(Color.white);
	int p=(int)(POS);
        g.fillRect(p-1,y+1,2,h-2); 
        g.drawRect(p-1,y+1,2,h-2); 
    }

    void configure(Point p) {
        if((ACTIVE==1)&&(p.x<x+w)&&(p.x>x)) POS=p.x;
    }

    void activate(Point p) {
	ACTIVE=0;
	if(inside(p)==1) ACTIVE=1;
    }
    
    int inside(Point p) {
        int test=0;
        if((p.x>x)&&(p.x<x+w)&&(p.y>y)&&(p.y<y+h)) test=1;
        return(test);
    }

    public double getValue() {
	return 1.0*(this.POS-this.x)/this.w;
    }

}
